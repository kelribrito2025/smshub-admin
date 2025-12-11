import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Renderiza um template de email substituindo variáveis dinâmicas
 * @param templateName Nome do arquivo de template (sem extensão)
 * @param variables Objeto com as variáveis a serem substituídas
 * @returns HTML renderizado com as variáveis substituídas
 */
export function renderEmailTemplate(
  templateName: string,
  variables: Record<string, string>
): string {
  const templatePath = join(__dirname, "email-templates", `${templateName}.html`);
  let template = readFileSync(templatePath, "utf-8");

  // Substituir todas as variáveis no formato {{VARIABLE_NAME}}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    template = template.replace(regex, value);
  }

  return template;
}

/**
 * Gera o HTML do email de ativação de conta
 * @param userName Nome do usuário
 * @param activationLink Link de ativação completo
 * @param expirationTime Tempo de expiração (ex: "24 horas")
 * @returns HTML renderizado do email
 */
export function renderActivationEmail(
  userName: string,
  activationLink: string,
  expirationTime: string = "24 horas"
): string {
  return renderEmailTemplate("activation-email-cyber", {
    USER_NAME: userName,
    ACTIVATION_LINK: activationLink,
  });
}
