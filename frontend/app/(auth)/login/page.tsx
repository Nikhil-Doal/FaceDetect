"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and username
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username);
        
        console.log("Login successful, token saved");
        console.log("Has acquaintances:", data.hasAcquaintances);
        
        // Redirect based on whether user has added people
        if (data.hasAcquaintances) {
          router.push("/home");
        } else {
          router.push("/add");
        }
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Failed to connect to server");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10">
      {/* Back to Home Link */}
      <Link
        href="/"
        className="absolute top-6 left-6 text-white/60 hover:text-white transition font-serif text-sm flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Home
      </Link>

      <h1 className="font-serif text-7xl mb-6 text-center tracking-tighter text-green-400">
        Login Page
      </h1>

      <form
        onSubmit={handleSubmit}
        className="glass w-1/4 p-6 flex flex-col gap-4 text-white rounded-2xl bg-white/10"
      >
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-full px-4 py-2 text-center">
            {error}
          </div>
        )}

        <input
          name="email"
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
          required
          className="rounded-full px-3 py-2 bg-white/10 border border-white/30 backdrop-blur-sm text-white font-serif text-xl mt-4"
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          required
          className="rounded-full px-3 py-2 bg-white/10 border border-white/30 backdrop-blur-sm text-white font-serif text-xl"
        />

        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-white text-black px-6 py-2 font-medium font-serif text-xl mt-4 hover:bg-white/0 hover:text-white border border-white/30 transition-all duration-1000 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* Register Link */}
        <div className="text-center mt-4 pb-2">
          <p className="text-white/60 text-sm">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-green-400 hover:text-green-300 transition font-medium"
            >
              Register here
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}