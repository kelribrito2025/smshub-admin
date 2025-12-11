import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { sendActivationEmail } from "../mailchimp-email";

export const emailTestRouter = router({
  /**
   * Enviar email de teste de ativação
   */
  sendTestActivationEmail: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string(),
        customerId: z.number().optional().default(99999),
      })
    )
    .mutation(async ({ input }) => {
      const success = await sendActivationEmail(
        input.email,
        input.name,
        input.customerId
      );

      if (!success) {
        throw new Error("Falha ao enviar email de teste");
      }

      return {
        success: true,
        message: `Email de teste enviado para ${input.email}`,
      };
    }),
});
