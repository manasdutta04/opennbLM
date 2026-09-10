import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  return <main><aside><strong>opennbLM</strong><p>Conversations</p><p>Brain settings</p></aside><section><h1>Welcome to opennbLM</h1><p>The desktop foundation is ready. Conversation, teaching, memory, and Rumik runtime features are not implemented yet.</p></section></main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
