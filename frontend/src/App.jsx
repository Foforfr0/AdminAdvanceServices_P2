import { Routes, Route } from "react-router-dom";
import NavBar from "./components/layout/NavBar";
import Login from "./screens/auth/Login";
import Home from "./screens/Home";
import NotFound from "./screens/errors/NotFound";

function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
