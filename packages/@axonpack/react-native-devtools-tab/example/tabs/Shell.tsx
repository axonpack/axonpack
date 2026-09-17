import { useState } from "react";

export default function Shell() {
  const [command, setCommand] = useState("uname -a && pwd && whoami");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);

  const run = async () => {
    if(1==1)return; //TODO: skip for now. will plan to implement later.
    setRunning(true);
    setOutput("");

    try {

      //TODO: skip for now. will plan to implement later.
      // const response = await fetch(`${devServer}/exec-experiment/run`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ cmd: command }),
      // });
      // const result = await response.json();
      // setOutput(`${result.stdout}${result.stderr}\n[exit ${result.code}]`);
    } catch (error) {
      setOutput(String(error));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <h1 style={{ fontSize: 13 }}>Run a command where Metro is</h1>
      <p>
        {/* The caret stays put across redraws, because the panel is sent changes, not a new tree. */}
        <input
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          style={{ width: 360 }}
        />{" "}
        <button onClick={() => void run()} disabled={running}>
          {running ? "running…" : "Run"}
        </button>
      </p>
      {output ? <pre>{output}</pre> : null}
    </div>
  );
}
