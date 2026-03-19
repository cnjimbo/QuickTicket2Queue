import { IpcHandle } from "@doubleshot/nest-electron";
import { Controller } from "@nestjs/common";
import { Payload } from "@nestjs/microservices";
import { AppServiceUpdate } from "./app.service.update";

@Controller()
export class AppControllerUpdate {
    public constructor(private readonly updateService: AppServiceUpdate) { }

    @IpcHandle("check-for-app-updates")
    public async checkForAppUpdates() {
        return await this.updateService.checkForAppUpdates();
    }

    @IpcHandle("download-app-update")
    public async downloadAppUpdate() {
        return await this.updateService.downloadAppUpdate();
    }

    @IpcHandle("install-downloaded-app-update")
    public async installDownloadedAppUpdate() {
        return await this.updateService.installDownloadedAppUpdate();
    }

    @IpcHandle("get-app-version")
    public async getAppVersion() {
        return await this.updateService.getAppVersion();
    }

    @IpcHandle("get-update-preferences")
    public async getUpdatePreferences() {
        return await this.updateService.getUpdatePreferences();
    }

    @IpcHandle("set-update-preferences")
    public async setUpdatePreferences(
        @Payload() partialPreferences: { includeBeta?: boolean } | undefined,
    ) {
        return await this.updateService.setUpdatePreferences(partialPreferences);
    }
}