import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

// A shortcut: any page can call useAuth() to see who is logged in.
export default function useAuth() {
  return useContext(AuthContext);
}
