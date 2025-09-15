import { Link } from "react-router-dom";

function NavBar() {
  return (
    <div className="flex items-center gap-5 justify-center w-screen h-auto py-3 bg-white shadow-xl">
      <Link
        to="/home"
        className="text-xl font-bold text-gray-800 hover:text-gray-600"
      >
        Inicio
      </Link>
      <Link
        to="/home"
        className="text-xl font-bold text-gray-800 hover:text-gray-600"
      >
        Mis dispositivos
      </Link>
      <Link
        to="/home"
        className="text-xl font-bold text-gray-800 hover:text-gray-600"
      >
        En vivo
      </Link>
    </div>
  );
}

export default NavBar;
