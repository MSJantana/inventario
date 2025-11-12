pipeline {
  agent any
  options {
    timestamps()
  }

  parameters {
    // 🔧 Ajuste conforme seu cenário
    string(name: 'DOCKER_REGISTRY', defaultValue: 'docker.io', description: 'Registro (ex.: docker.io ou ghcr.io)')
    string(name: 'IMAGE_OWNER',     defaultValue: 'msoftsantana', description: 'Usuário/organização no registry (ex.: msoftsantana)')
    string(name: 'IMAGE_NAMESPACE', defaultValue: 'inventario', description: 'Base do nome da imagem (ex.: inventario)')
    string(name: 'REGISTRY_CREDENTIALS_ID', defaultValue: 'dockerhub-msoftsantana', description: 'ID das credenciais no Jenkins para o registry')
    string(name: 'VITE_API_BASE_URL', defaultValue: '', description: 'Opcional: URL base para o frontend (build arg)')

    booleanParam(name: 'PUSH_IMAGE', defaultValue: true, description: 'Fazer push das imagens')
    booleanParam(name: 'USE_BUILDX', defaultValue: true, description: 'Usar docker buildx com cache no registry')
  }

  environment {
    DOCKER_BUILDKIT = '1'
  }

  stages {

    stage('Checkout') {
      steps {
        ansiColor('xterm') {
          checkout scm
        }
      }
    }

    stage('Compute Metadata') {
      steps {
        ansiColor('xterm') {
          script {
            env.BRANCH_SAFE   = (env.BRANCH_NAME ?: 'local').replaceAll(/[^a-zA-Z0-9_.-]/, '-')
            env.COMMIT_SHORT  = (env.GIT_COMMIT ?: 'local').take(7)
            env.IS_MAIN       = ((env.BRANCH_NAME ?: '') in ['main','master']) ? 'true' : 'false'
            def bname = (env.BRANCH_NAME ?: '')
            if (bname ==~ /^release\//) {
              env.SPECIAL_TAG = 'stable'
            } else if (bname ==~ /^hotfix\//) {
              env.SPECIAL_TAG = 'hotfix'
            } else {
              env.SPECIAL_TAG = ''
            }
            echo "Branch: ${env.BRANCH_NAME} -> ${env.BRANCH_SAFE} | Commit: ${env.COMMIT_SHORT} | IsMain: ${env.IS_MAIN} | SpecialTag: ${env.SPECIAL_TAG}"
          }
        }
      }
    }

    stage('Preflight (Docker)') {
      steps {
        ansiColor('xterm') {
          sh '''
            command -v docker >/dev/null 2>&1 || { echo "❌ Docker não encontrado no agente. Instale/aponte um nó com Docker."; exit 1; }
            docker version
          '''
        }
      }
    }

    stage('Login to Registry') {
      when { expression { return params.PUSH_IMAGE && (params.DOCKER_REGISTRY?.trim()) && (params.REGISTRY_CREDENTIALS_ID?.trim()) } }
      steps {
        ansiColor('xterm') {
          withCredentials([usernamePassword(credentialsId: params.REGISTRY_CREDENTIALS_ID, usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
            sh '''
              echo "$REG_PASS" | docker login -u "$REG_USER" --password-stdin ${DOCKER_REGISTRY}
            '''
          }
        }
      }
    }

    stage('Setup buildx') {
      when { expression { return params.USE_BUILDX } }
      steps {
        ansiColor('xterm') {
          sh '''
            docker buildx version || true
            docker buildx create --name jx || true
            docker buildx use jx
            docker buildx inspect --bootstrap || true
          '''
        }
      }
    }

    stage('Build & Push Images') {
      parallel {

        stage('Backend') {
          steps {
            ansiColor('xterm') {
              script {
                def context    = 'backend'
                def dockerfile = "${context}/Dockerfile"
                def imageBase  = "${params.DOCKER_REGISTRY}/${params.IMAGE_OWNER}/${params.IMAGE_NAMESPACE}-backend"

                def tags = [env.BRANCH_SAFE, env.COMMIT_SHORT]
                if (env.SPECIAL_TAG?.trim()) { tags << env.SPECIAL_TAG }
                if (env.IS_MAIN == 'true')    { tags << 'latest' }

                if (params.USE_BUILDX) {
                  sh "docker buildx use jx"
                  sh "docker buildx inspect --bootstrap || true"

                  // só usa --cache-from se o cache já existir (primeiro build não quebra)
                  sh """
                    if docker buildx imagetools inspect ${imageBase}:cache >/dev/null 2>&1; then
                      echo "CACHE_FROM_OK=1" > .cache_backend
                    else
                      echo "CACHE_FROM_OK=0" > .cache_backend
                    fi
                  """

                  def tagArgs   = tags.collect { "-t ${imageBase}:${it}" }.join(' ')
                  def cacheTo   = (params.PUSH_IMAGE) ? "--cache-to=type=registry,ref=${imageBase}:cache,mode=max" : ""
                  def cacheFrom = sh(script: "grep -q 'CACHE_FROM_OK=1' .cache_backend && echo '--cache-from=type=registry,ref=${imageBase}:cache' || true", returnStdout: true).trim()

                  sh """
                    docker buildx build \
                      -f ${dockerfile} \
                      ${tagArgs} \
                      ${cacheTo} ${cacheFrom} \
                      --provenance=false \
                      ${context} \
                      ${params.PUSH_IMAGE ? '--push' : ''}
                  """
                } else {
                  def tagArgs = tags.collect { "-t ${imageBase}:${it}" }.join(' ')
                  sh "docker build -f ${dockerfile} ${tagArgs} ${context}"
                  if (params.PUSH_IMAGE) {
                    tags.each { t -> sh "docker push ${imageBase}:${t}" }
                  }
                }
              }
            }
          }
        }

        stage('Frontend') {
          steps {
            ansiColor('xterm') {
              script {
                def context    = 'frontend'
                def dockerfile = "${context}/Dockerfile"
                def imageBase  = "${params.DOCKER_REGISTRY}/${params.IMAGE_OWNER}/${params.IMAGE_NAMESPACE}-frontend"

                def tags = [env.BRANCH_SAFE, env.COMMIT_SHORT]
                if (env.SPECIAL_TAG?.trim()) { tags << env.SPECIAL_TAG }
                if (env.IS_MAIN == 'true')    { tags << 'latest' }

                def viteArg = (params.VITE_API_BASE_URL?.trim()) ? "--build-arg VITE_API_BASE_URL=${params.VITE_API_BASE_URL}" : ""

                if (params.USE_BUILDX) {
                  sh "docker buildx use jx"
                  sh "docker buildx inspect --bootstrap || true"

                  // só usa --cache-from se o cache já existir
                  sh """
                    if docker buildx imagetools inspect ${imageBase}:cache >/dev/null 2>&1; then
                      echo "CACHE_FROM_OK=1" > .cache_frontend
                    else
                      echo "CACHE_FROM_OK=0" > .cache_frontend
                    fi
                  """

                  def tagArgs   = tags.collect { "-t ${imageBase}:${it}" }.join(' ')
                  def cacheTo   = (params.PUSH_IMAGE) ? "--cache-to=type=registry,ref=${imageBase}:cache,mode=max" : ""
                  def cacheFrom = sh(script: "grep -q 'CACHE_FROM_OK=1' .cache_frontend && echo '--cache-from=type=registry,ref=${imageBase}:cache' || true", returnStdout: true).trim()

                  sh """
                    docker buildx build \
                      -f ${dockerfile} \
                      ${tagArgs} \
                      ${cacheTo} ${cacheFrom} \
                      --provenance=false \
                      ${viteArg} \
                      ${context} \
                      ${params.PUSH_IMAGE ? '--push' : ''}
                  """
                } else {
                  def tagArgs = tags.collect { "-t ${imageBase}:${it}" }.join(' ')
                  sh "docker build -f ${dockerfile} ${viteArg} ${tagArgs} ${context}"
                  if (params.PUSH_IMAGE) {
                    tags.each { t -> sh "docker push ${imageBase}:${t}" }
                  }
                }
              }
            }
          }
        }

      } // parallel
    } // stage Build & Push

  } // stages

  post {
    always {
      ansiColor('xterm') {
        sh 'command -v docker >/dev/null 2>&1 && docker images | head -n 20 || true'
      }
    }
  }
}
