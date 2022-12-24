import cors from 'cors';
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import indexRoutes from "./routes/index.js";

const app = express();

app.use(cors());

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(indexRoutes);
app.use(express.static(path.join(__dirname, 'public')));

app.listen(3000);
console.log(`Server on port 3000`);