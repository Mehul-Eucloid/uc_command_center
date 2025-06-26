import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./components/ui/button.js";
import { Input } from "./components/ui/input.js";
import { Card } from "./components/ui/card.js";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue
} from "./components/ui/select.js";
import { Mail, Key } from "lucide-react";
import { motion } from "framer-motion";
import axios from 'axios';

const BackgroundElements = () => {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10">
      <motion.div
        initial={{ x: -100, y: -100 }}
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          transition: { duration: 20, repeat: Infinity, ease: "linear" }
        }}
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 opacity-10 blur-xl"
      />
      <motion.div
        initial={{ x: 200, y: 300 }}
        animate={{
          x: [0, -100, 0],
          y: [0, -150, 0],
          transition: { duration: 25, repeat: Infinity, ease: "linear" }
        }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 opacity-10 blur-xl"
      />
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: Math.random() * 100 - 50,
            y: Math.random() * 100 - 50,
            opacity: 0
          }}
          animate={{
            x: [0, Math.random() * 100 - 50],
            y: [0, Math.random() * 100 - 50],
            opacity: [0, 0.05, 0],
            transition: {
              duration: 15 + Math.random() * 15,
              repeat: Infinity,
              repeatType: "reverse"
            }
          }}
          className="absolute w-2 h-2 rounded-full bg-indigo-600"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM3YzNkZjkiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0di00aC0ydjRoLTR2Mmg0djRoMnYtNGg0di0yaC00em0wLTMwVjBoLTJ2NGgtNHYyaDR2NGgydi00aDR2LTJoLTR6TTYgMzR2LTRINHY0SDB2Mmg0djRINnYtNGg0di0ySDZ6TTYgNFYwSDR2NEgwdjJoNHY0SDZ2LTRoNHYtMkg2eiIvPjwvZz48L2c+PC9zdmc+')] opacity-10" />
    </div>
  );
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pat, setPat] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState("db_certification");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (!email.includes("@") || email.trim() === "") {
        setError("Please enter a valid email address");
        setIsLoading(false);
        return;
      }

      if (!pat.trim()) {
        setError("Please enter your Databricks Personal Access Token");
        setIsLoading(false);
        return;
      }

      // Map the selected workspace to its corresponding Databricks host
      const workspaceToHostMap = {
        db_certification: "https://dbc-6e076fbc-a34a.cloud.databricks.com", // Replace with actual URL
        demo: "https://<demo-workspace>.cloud.databricks.com" // Replace with actual demo workspace URL
      };

      const databricksHost = workspaceToHostMap[selectedWorkspace];
      if (!databricksHost) {
        setError("Invalid workspace selected");
        setIsLoading(false);
        return;
      }

      // Call the backend to validate the PAT
      const response = await axios.post("http://localhost:5000/api/validate-pat", {
        pat,
        databricksHost
      });

      const user = response.data;
      localStorage.setItem('authToken', pat);
      localStorage.setItem('user', JSON.stringify({
        email: user.userName,
        userId: user.id,
        databricksHost, // Store the host for future requests
        workspace: selectedWorkspace
      }));
      navigate("/home", { replace: true });
    } catch (err) {
      console.error('Error validating PAT:', err.response?.data || err.message);
      console.error('Status:', err.response?.status);
      console.error('Headers:', err.response?.headers);
      setError(err.response?.data?.error || 'Invalid Personal Access Token. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <BackgroundElements />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="p-8 shadow-xl rounded-xl bg-white/90 backdrop-blur-sm border border-indigo-50">
          <div className="text-center mb-8">
            <motion.h1 className="text-3xl font-bold mb-2">
              <span className="bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
                Databricks SCIM CLI
              </span>
            </motion.h1>
            <p className="text-gray-600">Sign in with your Databricks Personal Access Token</p>
          </div>

          {error && (
            <motion.div
              className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="pl-10 border-indigo-100 hover:border-indigo-300 focus:border-indigo-400 focus:ring-indigo-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label htmlFor="pat" className="block text-sm font-medium text-gray-600 mb-1">
                Personal Access Token
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="pat"
                  type="password"
                  placeholder="Enter your Databricks PAT"
                  className="pl-10 border-indigo-100 hover:border-indigo-300 focus:border-indigo-400 focus:ring-indigo-300"
                  value={pat}
                  onChange={(e) => setPat(e.target.value)}
                  required
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <label htmlFor="workspace" className="block text-sm font-medium text-gray-600 mb-1">
                Workspace
              </label>
              <Select
                value={selectedWorkspace}
                onValueChange={setSelectedWorkspace}
              >
                <SelectTrigger className="w-[180px] bg-white/90 hover:bg-gray-50 border border-indigo-100">
                  <SelectValue placeholder="Select Workspace" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-indigo-100">
                  <SelectItem value="db_certification">db_certification</SelectItem>
                  <SelectItem value="demo">demo</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-700 hover:to-indigo-600 transition-all shadow-md hover:shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Sign In"}
              </Button>
            </motion.div>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}