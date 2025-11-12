pipeline {
  agent any
  options {
    timestamps()
    wrap([$class: 'AnsiColorBuildWrapper', colorMapName: 'xterm'])
  }

  parameters {
    string(name: 'DOCKER_REGISTRY', defaultValue: '', description: 'Registry (ex.: docker.io/<usuario> ou ghcr.io/<org>)')
    string(name: 'REGISTRY_CREDENTIALS_ID', defaultValue: '', description: 'ID das credenciais no Jenkins para o registry')
    string(name: 'IMAGE_NAMESPACE', defaultValue: 'inventario', description: 'Namespace/base do nome da imagem (ex.: org/app)')
    booleanParam(name: 'PUSH_IMAGE', defaultValue: true, description: 'Fazer push das imagens')
    booleanParam(name: 'USE_BUILDX', defaultValue: true, description: 'Usar docker buildx com cache no registry')
  }

  environment {
    DOCKER_BUILDKIT = '1'
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Compute Metadata') {
      steps {
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

    stage('Login to Registry') {
      when { expression { return params.PUSH_IMAGE && (params.DOCKER_REGISTRY?.trim()) && (params.REGISTRY_CREDENTIALS_ID?.trim()) } }
      steps {
        withCredentials([usernamePassword(credentialsId: params.REGISTRY_CREDENTIALS_ID, usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
          sh "echo $REG_PASS | docker login -u $REG_USER --password-stdin ${params.DOCKER_REGISTRY}"
        }
      }
    }

    stage('Setup buildx') {
      when { expression { return params.USE_BUILDX } }
      steps {
        sh """
          docker buildx version || true
          docker buildx create --name jx || true
          docker buildx use jx
          docker buildx inspect --bootstrap || true
        """
      }
    }

    stage('Build & Push Images') {
      parallel {
        stage('Backend') {
          steps {
            script {
              def context    = 'backend'
              def dockerfile = "${context}/Dockerfile"
              def imageBase  = (params.DOCKER_REGISTRY?.trim()) ? "${params.DOCKER_REGISTRY}/${params.IMAGE_NAMESPACE}-backend" : "${params.IMAGE_NAMESPACE}-backend"
              def tags       = [env.BRANCH_SAFE, env.COMMIT_SHORT]
              if (env.SPECIAL_TAG?.trim()) { tags << env.SPECIAL_TAG }
              if (env.IS_MAIN == 'true') { tags << 'latest' }

              if (params.USE_BUILDX) {
                sh "docker buildx use jx"
                sh "docker buildx inspect --bootstrap || true"

                def tagArgs = tags.collect { "-t ${imageBase}:${it}" }.join(' ')
                def cacheArgs = ''
                if (params.PUSH_IMAGE && (params.DOCKER_REGISTRY?.trim())) {
                  cacheArgs = "--cache-to=type=registry,ref=${imageBase}:cache,mode=max --cache-from=type=registry,ref=${imageBase}:cache"
                }

                sh "docker buildx build ${cacheArgs} -f ${dockerfile} ${tagArgs} ${context} ${params.PUSH_IMAGE ? '--push' : ''}"
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

        stage('Frontend') {
          steps {
            script {
              def context    = 'frontend'
              def dockerfile = "${context}/Dockerfile"
              def imageBase  = (params.DOCKER_REGISTRY?.trim()) ? "${params.DOCKER_REGISTRY}/${params.IMAGE_NAMESPACE}-frontend" : "${params.IMAGE_NAMESPACE}-frontend"
              def tags       = [env.BRANCH_SAFE, env.COMMIT_SHORT]
              if (env.SPECIAL_TAG?.trim()) { tags << env.SPECIAL_TAG }
              if (env.IS_MAIN == 'true') { tags << 'latest' }

              if (params.USE_BUILDX) {
                sh "docker buildx use jx"
                sh "docker buildx inspect --bootstrap || true"

                def tagArgs = tags.collect { "-t ${imageBase}:${it}" }.join(' ')
                def cacheArgs = ''
                if (params.PUSH_IMAGE && (params.DOCKER_REGISTRY?.trim())) {
                  cacheArgs = "--cache-to=type=registry,ref=${imageBase}:cache,mode=max --cache-from=type=registry,ref=${imageBase}:cache"
                }

                sh "docker buildx build ${cacheArgs} -f ${dockerfile} ${tagArgs} ${context} ${params.PUSH_IMAGE ? '--push' : ''}"
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
    }
  }

  post {
    always {
      script {
        sh 'docker images | head -n 20 || true'
      }
    }
  }
}