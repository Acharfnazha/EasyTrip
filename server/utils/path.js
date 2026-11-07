import path from "path";

// The folder of the whole project (Easy_Trip), so the other files don't have to guess paths.
// import.meta.dirname is the folder of this file: server/utils. Two levels up is the project.
const rootDir = path.join(import.meta.dirname, "..", "..");

export default rootDir;
