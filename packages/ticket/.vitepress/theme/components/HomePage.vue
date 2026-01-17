<script setup lang="ts">
import { ref, reactive } from 'vue'
import axios from 'axios';
import qs from 'qs';

type Option = { des: string; queue: string }

axios.defaults.baseURL = 'https://api.example.com';
axios.defaults.timeout = 10000;
const queue_val = ref('')
const options: Option[] = [
  { des: '域名申请、解析', queue: 'GBL-NETWORK DDI' },
  { des: '安装操作系统', queue: 'GBL-WTE-SAMS-OS' },
  { des: '安装数据库', queue: 'GBL-WTE-SAMS-DBA' },
  { des: 'Local App DevOps', queue: 'CHN-LOCAL APP DEVOPS' },
  { des: '服务器采购', queue: 'GBL-HARDWARE PROCUREMENT' },
  { des: '软件采购', queue: 'GBL-SOFTWARE PROCUREMENT' },
  { des: '账号权限申请', queue: 'GBL-ACCOUNT MANAGEMENT' },
  { des: '其他', queue: 'GBL-OTHER' },
]

const querySearch = (query: string, cb: (results: Option[]) => void) => {
  const result = options.filter(
    (item) =>
      item.des.toLowerCase().includes(query.toLowerCase()) ||
      item.queue.toLowerCase().includes(query.toLowerCase()),
  )
  cb(result)
}
const ticket = reactive({
  title: '',
  content: ''
})

function submitTicket() {
  // TODO: Implement ticket submission logic here
  console.log('Submitting ticket:', ticket, 'Queue:', queue_val.value)
  getToken();
}


function getToken() {

  var data = qs.stringify({
    'grant_type': 'client_credentials',
    'client_secret': '',
    'client_id': ''
  });
  var config = {
    method: 'post',
    url: 'https://pfetst.service-now.com/oauth_token.do',
    headers: {
      'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
      'Authorization': 'Bearer zSZYMAxgSsUPNu8bse-A8CO7pS9NRYGfqwSOBast_5bNGDUtL3hcuI14RyQb4HAnyDpDyKf9-w6TWG1e17CqEA',
      'Accept': '*/*',
      'Host': 'pfetst.service-now.com',
      'Connection': 'keep-alive',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': 'BIGipServerpool_pfetst=f0dec4b40e6aa7fbbc9afd1ff3c1126c; JSESSIONID=21FE46F18B3B2CB9BEE6B65627B31BB5; glide_user_route=glide.d0fc93c4f352848effe4484033009e26; glide_node_id_for_js=e6f59d33e0883d67227073aa3a3cbc2e7bd32189de853ba0c0e2eeb478fb7e28'
    },
    data: data
  };

  axios(config)
    .then(function (response) {
      console.log(JSON.stringify(response.data));
    })
    .catch(function (error) {
      console.log(error);
    });

}
</script>

<template>
  <div class="content">
    <div class="content-container">
      <main class="main">
        <h1> 提交工单 </h1><br />

        <el-card style="margin-top: 16px">
          <div style="margin-bottom: 8px; font-weight: 600;"></div>
          <el-input v-model="ticket.title" placeholder="请输入工单简要标题" clearable show-word-limit maxlength="100" />
          <div style="margin-bottom: 8px; font-weight: 600;"></div>
          <el-input v-model="ticket.content" type="textarea" :rows="6" placeholder="请输入工单详细描述（支持换行）" clearable
            show-word-limit maxlength="1000" />

          <div style="margin-bottom: 8px; font-weight: 600;"></div>
          <el-autocomplete v-model="queue_val" :fetch-suggestions="querySearch" placeholder="请输入以筛选队列" value-key="des">
            <template #default="scope">
              <div v-if="scope?.item" class="auto-item"
                @mouseenter="() => console.log('hover:', scope.item.des, scope.item.queue)">
                {{ scope.item.des }}（{{ scope.item.queue }}）
              </div>
            </template>
          </el-autocomplete>
          <div style="margin-bottom: 8px; font-weight: 600;"></div>
          <el-button type="primary" @click="submitTicket">提交工单</el-button>
        </el-card>
      </main>
    </div>
  </div>
</template>
