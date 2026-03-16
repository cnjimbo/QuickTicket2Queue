import { Injectable } from "@nestjs/common";
import { shell } from "electron";
@Injectable()
export class AppService {
  public async openExternalLink(url: string): Promise<void> {
    return await shell.openExternal(url);
  }
}
