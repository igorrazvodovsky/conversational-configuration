import { useAgent } from "@copilotkit/react-core/v2";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const HeadlessChat = () => {
  const { agent } = useAgent();
  const [message, setMessage] = useState("");

  const sendMessage = useCallback(
    (message: string) => {
      agent.addMessage({
        role: "user",
        id: crypto.randomUUID(),
        content: message,
      });
      agent.runAgent();
      setMessage("");
    },
    [agent],
  );

  return (
    <div className="space-y-2">
      <h1>Chat</h1>
      {agent.messages.map((message) => (
        <div key={message.id}>
          <p>{JSON.stringify(message.content)}</p>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button onClick={() => sendMessage(message)}>Send</Button>
      </div>
    </div>
  );
};
