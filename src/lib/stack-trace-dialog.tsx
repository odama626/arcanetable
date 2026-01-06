import { createMemo, createSignal, For } from 'solid-js';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { capturedErrors, renderer } from './globals';
import {
  getBuildData,
  getRendererStats,
  getWebGLData,
  serializeConsoleBuffer,
} from './console-capture';

export default function StackTraceDialog(props) {
  const [dismissedCount, setDismissedCount] = createSignal(0);

  const errorReport = createMemo(() => {
    return JSON.stringify(
      {
        log: serializeConsoleBuffer(),
        errors: capturedErrors().map(e => ({ error: e.message, stack: e.stack })),
        extra: {
          webgl: getWebGLData(renderer),
          renderer: getRendererStats(renderer),
          build: getBuildData(),
        },
      },
      null,
      2,
    );
  });

  return (
    <Dialog
      open={dismissedCount() < capturedErrors().length}
      onOpenChange={open => {
        if (!open) setDismissedCount(c => c + 1);
      }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Something went wrong</DialogTitle>
        </DialogHeader>
        <DialogDescription style='overflow: hidden;'>
          <div class='error-report-help'>
            <h3>Help improve Arcanetable</h3>

            <p>
              If you have a moment, please share the copied error report in the
              <a
                href='https://discord.com/channels/1308167761947529407/1308173590964736030'
                target='_blank'
                rel='noopener noreferrer'>
                #bug-reports channel on our Discord
              </a>
              .
            </p>

            <p>
              Adding a sentence like
              <q>I was moving cards around when this happened</q>
              is incredibly helpful.
            </p>

            <p>This report includes only technical information.</p>
          </div>
          <div style='overflow: hidden'>
            <pre style='max-height: 20rem; overflow: auto; max-width: 100%;'>{errorReport()}</pre>
          </div>
        </DialogDescription>
        <DialogFooter>
          <Button onClick={() => setDismissedCount(capturedErrors().length)} variant='ghost'>
            Dismiss
          </Button>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(errorReport());
            }}>
            Copy Errors
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
