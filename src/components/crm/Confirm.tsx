import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Ask = { title: string; body?: string; action?: string };
const Ctx = createContext<(a: Ask) => Promise<boolean>>(async () => false);

/** Keyboard-operable confirm dialog; focus starts on Cancel and returns to the trigger. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [ask, setAsk] = useState<Ask | null>(null);
  const resolver = useRef<(v: boolean) => void>(undefined);
  const confirm = useCallback((a: Ask) => new Promise<boolean>((res) => { resolver.current = res; setAsk(a); }), []);
  const close = (v: boolean) => { resolver.current?.(v); resolver.current = undefined; setAsk(null); };
  return (
    <Ctx.Provider value={confirm}>
      {children}
      <AlertDialog.Root open={!!ask} onOpenChange={(o) => { if (!o) close(false); }}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[70] bg-background/90" />
          <AlertDialog.Content className="fixed inset-x-4 top-1/3 z-[71] mx-auto max-w-md rounded-lg border border-border bg-background p-6">
            <AlertDialog.Title className="text-lg font-semibold">{ask?.title}</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-base text-muted-foreground">{ask?.body ?? "This cannot be undone."}</AlertDialog.Description>
            <div className="mt-6 flex flex-wrap gap-3">
              <AlertDialog.Cancel asChild><Button variant="editorial" autoFocus>Cancel</Button></AlertDialog.Cancel>
              <AlertDialog.Action asChild><Button variant="editorial" className="text-destructive" onClick={() => close(true)}>{ask?.action ?? "Delete"}</Button></AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </Ctx.Provider>
  );
}

export const useConfirm = () => useContext(Ctx);
