import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the correct path for email templates in both dev and production
 */
function getTemplatePath(templateName: string): string {
  // In production (bundled), templates are copied to dist/email-templates
  const prodPath = join(__dirname, "email-templates", `${templateName}.html`);
  
  // In development, templates are in server/email-templates
  const devPath = join(__dirname, "../email-templates", `${templateName}.html`);
  
  // Try production path first, fallback to dev path
  if (existsSync(prodPath)) {
    return prodPath;
  } else if (existsSync(devPath)) {
    return devPath;
  } else {
    throw new Error(`Email template not found: ${templateName} (tried ${prodPath} and ${devPath})`);
  }
}

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
  const templatePath = getTemplatePath(templateName);
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
