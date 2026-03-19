import * as os from 'os';

import { Injectable } from '@nestjs/common'

@Injectable()
export class AppServiceOS {
    public getUserName() {
        const username = process.env.USERNAME || os.userInfo().username;
        return username;
    }

    public isDomainEnvironment() {
        const userDnsDomain = (process.env.USERDNSDOMAIN ?? '').trim();
        if (userDnsDomain) {
            return true;
        }

        const userDomain = (process.env.USERDOMAIN ?? '').trim().toUpperCase();
        const computerName = (process.env.COMPUTERNAME ?? '').trim().toUpperCase();
        if (!userDomain || !computerName) {
            return false;
        }

        return userDomain !== computerName;
    }
}
