import React from "react";
import ReactDOM from "react-dom/client";
import { StudentsPage } from "./features/students/StudentsPage";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StudentsPage />
  </React.StrictMode>,
);
