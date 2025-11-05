import nodemailer from 'nodemailer';

// Configuração do transporter do nodemailer
const createTransporter = () => {
  // Para ambiente de desenvolvimento, use um serviço de teste como Ethereal
  // Para produção, configure com seus dados reais de SMTP
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Função para enviar email de recuperação de senha
export const enviarEmailRecuperacaoSenha = async (email, token, baseUrl) => {
  try {
    const transporter = createTransporter();
    
    // URL para redefinição de senha
    const resetUrl = `${baseUrl}/redefinir-senha?token=${token}`;
    
    // Configuração do email
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Sistema de Inventário" <noreply@inventario.com>',
      to: email,
      subject: 'Recuperação de Senha',
      text: `Você solicitou a recuperação de senha. Clique no link a seguir para redefinir sua senha: ${resetUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a4a4a;">Recuperação de Senha</h2>
          <p>Você solicitou a recuperação de senha para sua conta no Sistema de Inventário.</p>
          <p>Clique no botão abaixo para redefinir sua senha:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Redefinir Senha
            </a>
          </div>
          <p>Se você não solicitou esta recuperação, ignore este email.</p>
          <p>Este link é válido por 1 hora.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #777; font-size: 12px;">Este é um email automático, por favor não responda.</p>
        </div>
      `,
    };
    
    // Enviar o email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado: %s', info.messageId);
    
    // Para desenvolvimento, retorna a URL de visualização do Ethereal
    if (process.env.NODE_ENV !== 'production') {
      console.log('URL de visualização: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return false;
  }
};