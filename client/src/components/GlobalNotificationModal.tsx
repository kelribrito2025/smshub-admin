import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

interface GlobalNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalNotificationModal({
  open,
  onOpenChange,
}: GlobalNotificationModalProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const sendNotificationMutation = trpc.notifications.sendAdminNotification.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setTitle("");
      setMessage("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleSend = () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    sendNotificationMutation.mutate({
      title: title.trim(),
      message: message.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Enviar Notificação Global</DialogTitle>
          <DialogDescription>
            Esta notificação será enviada para todos os usuários conectados (exceto admins)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder="Ex: Manutenção Programada"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={sendNotificationMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              placeholder="Ex: O sistema estará em manutenção das 02:00 às 04:00"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sendNotificationMutation.isPending}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sendNotificationMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
