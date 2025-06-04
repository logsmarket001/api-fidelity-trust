import { exec } from "child_process"
import logger from "../utils/logger"

// Run seed script
const runSeed = () => {
  exec("ts-node src/data/seedData.ts", (error, stdout, stderr) => {
    if (error) {
      logger.error(`Error: ${error.message}`)
      return
    }
    if (stderr) {
      logger.error(`Stderr: ${stderr}`)
      return
    }
    logger.info(`Stdout: ${stdout}`)
  })
}

// Export seed function
export default runSeed
