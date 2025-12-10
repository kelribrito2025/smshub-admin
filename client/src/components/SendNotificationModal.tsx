import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

interface SendNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendNotificationModal({
  open,
  onOpenChange,
}: SendNotificationModalProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"global" | "individual">("global");
  const [pinOrEmail, setPinOrEmail] = useState("");

  const sendNotificationMutation =
    trpc.notifications.sendAdminNotification.useMutation({
      onSuccess: (data) => {
        toast.success(data.message);
        handleClose();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const handleClose = () => {
    setTitle("");
    setMessage("");
    setType("global");
    setPinOrEmail("");
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    if (!message.trim()) {
      toast.error("Descrição é obrigatória");
      return;
    }

    if (type === "individual" && !pinOrEmail.trim()) {
      toast.error("PIN ou e-mail é obrigatório para notificações individuais");
      return;
    }

    // Send notification
    sendNotificationMutation.mutate({
      title: title.trim(),
      message: message.trim(),
      type,
      pinOrEmail: type === "individual" ? pinOrEmail.trim() : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Enviar Notificação</DialogTitle>
          <DialogDescription>
            Envie notificações para todos os usuários ou para um usuário
            específico.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título da Notificação</Label>
            <Input
              id="title"
              placeholder="Ex: Manutenção programada"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={sendNotificationMutation.isPending}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="message">Descrição</Label>
            <Textarea
              id="message"
              placeholder="Ex: O sistema estará em manutenção das 02:00 às 04:00"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sendNotificationMutation.isPending}
            />
          </div>

          {/* Tipo de envio */}
          <div className="space-y-2">
            <Label>Tipo de Envio</Label>
            <RadioGroup
              value={type}
              onValueChange={(value) => setType(value as "global" | "individual")}
              disabled={sendNotificationMutation.isPending}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="global" id="global" />
                <Label htmlFor="global" className="font-normal cursor-pointer">
                  Global (todos os usuários)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual" />
                <Label
                  htmlFor="individual"
                  className="font-normal cursor-pointer"
                >
                  Individual (usuário específico)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* PIN ou E-mail (condicional) */}
          {type === "individual" && (
            <div className="space-y-2">
              <Label htmlFor="pinOrEmail">PIN ou E-mail do Usuário</Label>
              <Input
                id="pinOrEmail"
                placeholder="Ex: 123 ou usuario@email.com"
                value={pinOrEmail}
                onChange={(e) => setPinOrEmail(e.target.value)}
                disabled={sendNotificationMutation.isPending}
              />
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={sendNotificationMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={sendNotificationMutation.isPending}
            >
              {sendNotificationMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Notificação
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
