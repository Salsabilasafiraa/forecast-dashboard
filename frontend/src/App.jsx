import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import ImportData from "./pages/ImportData";
import ImportHistory from "./pages/ImportHistory";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">

        <Sidebar />

        <main className="main-content">

          <Routes>

            <Route
              path="/"
              element={<Dashboard />}
            />

            <Route
              path="/import"
              element={<ImportData />}
            />

            <Route
              path="/history"
              element={<ImportHistory />}
            />

          </Routes>

        </main>

      </div>
    </BrowserRouter>
  );
}

export default App;