import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!username || !password) {
      setError("Por favor, completa todos los campos.");
      setSuccess(false);
      return;
    }

    if (username === "admin" && password === "1234") {
      setError("");
      setSuccess(true);
      navigate("/home");
    } else if (username != "admin" && password != "1234") {
      setError("Credenciales incorrectas.");
      setSuccess(false);
    } else if (!username || !password) {
      setError("Usuario o contraseña incorrectos.");
      setSuccess(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-blue-100">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">
        <h2 className="text-center text-3xl font-bold text-gray-800 mb-6">
          Inicio de sesión
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingresa tu usuario"
              className="w-full px-3 py-2 border rounded-lg text-gray-800 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
              className="w-full px-3 py-2 border rounded-lg text-gray-800 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            />
          </div>

          {error && (
            <div className="mb-1 p-3 rounded-lg bg-red-100 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-1 p-3 rounded-lg bg-green-100 text-green-600 text-sm font-medium">
              Credenciales correctas.
            </div>
          )}

          <button
            type="submit"
            className="mx-auto w-auto p-3 bg-blue-500 text-white py-2 rounded-lg font-semibold shadow-md hover:bg-blue-600 transition-colors duration-300"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
