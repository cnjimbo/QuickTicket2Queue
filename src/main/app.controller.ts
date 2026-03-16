import { IpcHandle } from "@doubleshot/nest-electron";
import { Controller } from "@nestjs/common";
import { Payload } from "@nestjs/microservices";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @IpcHandle("open-link")
  public async openExternalLink(@Payload() url: string): Promise<void> {
    await this.appService.openExternalLink(url);
  }
}
