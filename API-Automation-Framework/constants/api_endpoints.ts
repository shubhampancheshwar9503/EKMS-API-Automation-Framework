/**
 * Centralized API Endpoints for EKMS Services
 */
export const API_ENDPOINTS = {
  IP_WHITELIST: '/cb-ekms-srv/ip-whitelist',
  PARTITION_MODIFY: '/cb-ekms-srv/modify-part',
  MODIFY_GROUP: '/cb-ekms-srv/modify-group',
  MODIFY_OWNER: '/cb-ekms-srv/modify-owner',
  MODIFY_PRVLGS: '/cb-ekms-srv/modify-prvlgs',
  AUTH_TOKEN: process.env.AUTH_TOKEN_ENDPOINT || 'http://192.168.1.142:8008/authserver/oauth/token'
};

export const AUTH_HEADER = 'Authorization';
export const BEARER_PREFIX = 'Bearer ';

export const SHEET_TO_ENDPOINT: Record<string, string> = {
  'IP_Whitelist_Blacklist': API_ENDPOINTS.IP_WHITELIST,
  'Add_Delete_Partition': API_ENDPOINTS.PARTITION_MODIFY,
  'Modify_Group': API_ENDPOINTS.MODIFY_GROUP,
  'Modify_Owner': API_ENDPOINTS.MODIFY_OWNER,
  'Modify_Privileges': API_ENDPOINTS.MODIFY_PRVLGS,
};
