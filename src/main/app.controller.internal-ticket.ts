import { BrowserWindow } from "electron";
import { IpcHandle, Window } from "@doubleshot/nest-electron";
import { Controller } from "@nestjs/common";
import { Payload } from "@nestjs/microservices";
import type { TicketResponse, TicketType } from "@/types/orm_types";
import { AppServiceInternalTicket } from "./app.service.internal-ticket";

@Controller()
export class AppControllerInternalTicket {
    private readonly mainWin: BrowserWindow;

    constructor(
        private readonly internalTicketService: AppServiceInternalTicket,
        @Window() mainWin: BrowserWindow,
    ) {
        this.mainWin = mainWin;
    }

    @IpcHandle("internal-ticket")
    public async onInternalTicketSubmit(
        @Payload() data: TicketType,
    ): Promise<TicketResponse> {
        console.log("🚀 ~ AppControllerInternalTicket ~ onInternalTicketSubmit ~ data:", data);
        return await this.internalTicketService.submitInternalTicket(data, this.mainWin);
    }
}