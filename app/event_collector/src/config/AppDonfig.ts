import dotenv from "dotenv";

dotenv.config();

class AppConfig {
  public static readonly RPC_URL = process.env.RPC_URL;
  public static readonly CHAIN_ID = process.env.CHAIN_ID;
  public static readonly INTERVAL_MS = process.env.INTERVAL_MS;
  public static readonly CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
}

export default AppConfig;
