/* utils/create_all_scenarios.js
   Generates a standardized Excel workbook named 'EKMS_API_Endpoint.xlsx'
   with 5 dedicated endpoint sheets, containing a total of 75 scenarios (15 per sheet).
   Columns: Test_ID, Description, scenarioType, payloadJSON, expectedStatus, expectedResponse
*/

const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const workbook = xlsx.utils.book_new();
const headers = ['Test_ID', 'Description', 'scenarioType', 'payloadJSON', 'expectedStatus', 'expectedResponse'];

// Helper to generate a random txn id
const randTxn = () => 'TXN-' + Math.random().toString(36).substr(2, 8).toUpperCase();

// =============================================================================
// --- 1. IP Whitelist / Blacklist Sheet (15 scenarios) ---
// =============================================================================
const ipRows = [];

const ipScenarios = [
  // --- POSITIVE ---
  {
    testId: 'EKMS_IP_01',
    desc: 'Add a valid IP address to whitelist',
    scenarioType: 'Positive',
    action: 'add', ip: '192.168.0.1',
    status: 200,
    expectedRes: (txn) => ({ txn, ip: '192.168.0.1', status: '1', succMsg: 'IP has been whitelisted!' })
  },
  // --- NEGATIVE ---
  {
    testId: 'EKMS_IP_02',
    desc: 'Fail to add duplicate IP address while still whitelisted',
    scenarioType: 'Negative',
    action: 'add', ip: '192.168.0.1',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-102', errMsg: 'IP already exists' })
  },
  // --- POSITIVE ---
  {
    testId: 'EKMS_IP_03',
    desc: 'Remove a whitelisted IP address (blacklist it)',
    scenarioType: 'Positive',
    action: 'del', ip: '192.168.0.1',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'IP has been blacklisted!' })
  },
  {
    testId: 'EKMS_IP_04',
    desc: 'List all whitelisted IP addresses',
    scenarioType: 'Positive',
    action: 'list', ip: '',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'All whitelisted IPs listed successfully!' })
  },
  // --- NEGATIVE ---
  {
    testId: 'EKMS_IP_05',
    desc: 'Fail to remove a non-existent IP address',
    scenarioType: 'Negative',
    action: 'del', ip: '10.0.0.255',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-999', errMsg: 'IP not found or failed to remove' })
  },
  // --- POSITIVE ---
  {
    testId: 'EKMS_IP_06',
    desc: 'Add a second valid IP address to whitelist',
    scenarioType: 'Positive',
    action: 'add', ip: '192.168.1.100',  // randomized by mutatePayload to 192.168.0.x
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'IP has been whitelisted!' })
  },
  {
    testId: 'EKMS_IP_07',
    desc: 'Blacklist (remove) an IP from the whitelist',
    scenarioType: 'Positive',
    action: 'del', ip: '192.168.1.200',  // randomized by mutatePayload to 192.168.0.x
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'IP has been blacklisted!' })
  },
  {
    testId: 'EKMS_IP_08',
    desc: 'List whitelisted IPs after multiple add and delete operations',
    scenarioType: 'Positive',
    action: 'list', ip: '',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'All whitelisted IPs listed successfully!' })
  },
  // --- NEGATIVE ---
  {
    testId: 'EKMS_IP_09',
    desc: 'Fail to add restricted loopback IP address 127.0.0.1',
    scenarioType: 'Negative',
    action: 'add', ip: '127.0.0.1',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-004', errMsg: 'Invalid IP format: restricted address' })
  },
  {
    testId: 'EKMS_IP_10',
    desc: 'Fail to add restricted broadcast IP address 255.255.255.255',
    scenarioType: 'Negative',
    action: 'add', ip: '255.255.255.255',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-004', errMsg: 'Invalid IP format: restricted address' })
  },
  {
    testId: 'EKMS_IP_11',
    desc: 'Fail to add a restricted subnet IP address (192.168.2.25)',
    scenarioType: 'Negative',
    action: 'add', ip: '192.168.2.25',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-004', errMsg: 'Invalid IP format: restricted subnet' })
  },
  {
    testId: 'EKMS_IP_12',
    desc: 'Fail to add IP when ip field is missing from request',
    scenarioType: 'Negative',
    action: 'add', ip: '',  // omitted from payload (falsy = not added)
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-003', errMsg: 'Missing ip field' })
  },
  {
    testId: 'EKMS_IP_13',
    desc: 'Fail with an invalid action enum value in request',
    scenarioType: 'Negative',
    action: 'sync', ip: '192.168.0.1',  // 'sync' is not a valid action
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-002', errMsg: 'Invalid action enum' })
  },
  {
    testId: 'EKMS_IP_14',
    desc: 'Fail when the txn field is missing from the request',
    scenarioType: 'Negative',
    action: 'add', ip: '192.168.0.1', missingTxn: true,
    status: 200,
    expectedRes: () => ({ txn: '', status: '-1', errCode: 'EKMS-001', errMsg: 'Missing txn field' })
  },
  // --- POSITIVE ---
  {
    testId: 'EKMS_IP_15',
    desc: 'Verify whitelist listing returns correct response after all operations',
    scenarioType: 'Positive',
    action: 'list', ip: '',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'All whitelisted IPs listed successfully!' })
  }
];

ipScenarios.forEach(sc => {
  const txn = randTxn();
  const req = {};
  if (!sc.missingTxn) req.txn = txn;
  req.action = sc.action;
  if (sc.ip) req.ip = sc.ip;

  ipRows.push([
    sc.testId,
    sc.desc,
    sc.scenarioType,
    JSON.stringify(req),
    sc.status,
    JSON.stringify(sc.expectedRes(txn))
  ]);
});

// =============================================================================
// --- 2. Add / Delete Partition Sheet (15 scenarios) ---
// =============================================================================
const partRows = [];

const partScenarios = [
  // --- POSITIVE ---
  {
    testId: 'EKMS_Partition_01',
    desc: 'Add a new partition with valid alphanumeric name',
    scenarioType: 'Positive',
    action: 'add', partname: 'partprod25DNNH',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'New partition added successfully' })
  },
  {
    testId: 'EKMS_Partition_02',
    desc: 'Delete an existing partition successfully',
    scenarioType: 'Positive',
    action: 'del', partname: 'partprod25DNNH',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'Partition deleted successfully' })
  },
  {
    testId: 'EKMS_Partition_03',
    desc: 'List all partitions successfully',
    scenarioType: 'Positive',
    action: 'list', partname: '',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'Partitions listed successfully' })
  },
  // --- NEGATIVE ---
  {
    testId: 'EKMS_Partition_04',
    desc: 'Fail to add a duplicate partition (already_exists sentinel)',
    scenarioType: 'Negative',
    action: 'add', partname: 'already_exists',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-102', errMsg: 'Partition already exists' })
  },
  {
    testId: 'EKMS_Partition_05',
    desc: 'Fail to delete a non-existent partition',
    scenarioType: 'Negative',
    action: 'del', partname: 'non_existent',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-103', errMsg: 'Partition not found' })
  },
  {
    testId: 'EKMS_Partition_06',
    desc: 'Fail to add partition with underscore in name (non-alphanumeric)',
    scenarioType: 'Negative',
    action: 'add', partname: 'part_prod_25DNNH',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-301', errMsg: "Validation Failed: Field 'partname' must be alphanumeric and between 4 and 50 characters." })
  },
  {
    testId: 'EKMS_Partition_07',
    desc: 'Fail to add partition with dot in name',
    scenarioType: 'Negative',
    action: 'add', partname: 'part.prod25',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-301', errMsg: "Validation Failed: Field 'partname' must be alphanumeric and between 4 and 50 characters." })
  },
  {
    testId: 'EKMS_Partition_08',
    desc: 'Fail to add partition with space in name',
    scenarioType: 'Negative',
    action: 'add', partname: 'part prod25',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-301', errMsg: "Validation Failed: Field 'partname' must be alphanumeric and between 4 and 50 characters." })
  },
  {
    testId: 'EKMS_Partition_09',
    desc: 'Fail to add partition with name shorter than 4 characters',
    scenarioType: 'Negative',
    action: 'add', partname: 'abc',  // 3 chars — protected from mutation, fails length check
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-301', errMsg: "Validation Failed: Field 'partname' must be alphanumeric and between 4 and 50 characters." })
  },
  // --- POSITIVE ---
  {
    testId: 'EKMS_Partition_10',
    desc: 'Verify partition credentials with valid admin password',
    scenarioType: 'Positive',
    action: 'check', partname: 'prodPart123',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'Partition verified successfully' })
  },
  // --- NEGATIVE ---
  {
    testId: 'EKMS_Partition_11',
    desc: 'Fail to verify partition with incorrect admin password',
    scenarioType: 'Negative',
    action: 'check', partname: 'prodPart123', forceAdminPswrd: 'wrong_pass',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-104', errMsg: 'Authentication Failed: Incorrect partition admin password' })
  },
  // --- POSITIVE ---
  {
    testId: 'EKMS_Partition_12',
    desc: 'Add a partition with a long valid alphanumeric name',
    scenarioType: 'Positive',
    action: 'add', partname: 'ProdPartitionMaxLengthTest12345678',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'New partition added successfully' })
  },
  {
    testId: 'EKMS_Partition_13',
    desc: 'Add a partition with a number-only alphanumeric name',
    scenarioType: 'Positive',
    action: 'add', partname: '12345678',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'New partition added successfully' })
  },
  // --- NEGATIVE ---
  {
    testId: 'EKMS_Partition_14',
    desc: 'Fail to delete partition with active groups (without forceDelete)',
    scenarioType: 'Negative',
    action: 'del', partname: 'active_groups',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-999', errMsg: 'Partition Delete Failed: Active groups: 1 add check forceDelete to for deleting forcefully.' })
  },
  // --- POSITIVE ---
  {
    testId: 'EKMS_Partition_15',
    desc: 'List partitions to verify static partition inventory',
    scenarioType: 'Positive',
    action: 'list', partname: '',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'Partitions listed successfully' })
  }
];

partScenarios.forEach(sc => {
  const txn = randTxn();
  const req = { txn, action: sc.action };
  if (sc.partname) req.partname = sc.partname;
  if (sc.action !== 'list') {
    req.saUsername = '.env:SA_USERNAME';
    req.saPswrd = '.env:SA_PASSWORD';
    req.adminPswrd = sc.forceAdminPswrd !== undefined ? sc.forceAdminPswrd : '.env:ADMIN_PASSWORD';
  }

  partRows.push([
    sc.testId,
    sc.desc,
    sc.scenarioType,
    JSON.stringify(req),
    sc.status,
    JSON.stringify(sc.expectedRes(txn))
  ]);
});

// =============================================================================
// --- 3. Modify Group Sheet (15 scenarios) ---
// =============================================================================
const groupRows = [];

const groupScenarios = [
  // --- POSITIVE ---
  {
    testId: 'EKMS_Group_01',
    desc: 'Add a user group to a partition successfully',
    scenarioType: 'Positive',
    action: 'add', partName: 'prod_part', groupName: 'groupAlpha123', groupType: 'user',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'New group added successfully' })
  },
  {
    testId: 'EKMS_Group_02',
    desc: 'Delete a user group from a partition successfully',
    scenarioType: 'Positive',
    action: 'del', partName: 'prod_part', groupName: 'groupAlpha123', groupType: 'user',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'Group deleted successfully' })
  },
  {
    testId: 'EKMS_Group_03',
    desc: 'List all groups in a partition',
    scenarioType: 'Positive',
    action: 'list', partName: 'prod_part', groupName: '', groupType: '',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'Groups listed successfully' })
  },
  // --- NEGATIVE ---
  {
    testId: 'EKMS_Group_04',
    desc: 'Fail to add a duplicate group (already_exists sentinel)',
    scenarioType: 'Negative',
    action: 'add', partName: 'prod_part', groupName: 'already_exists', groupType: 'user',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-102', errMsg: 'Group already exists' })
  },
  {
    testId: 'EKMS_Group_05',
    desc: 'Fail to delete a non-existent group',
    scenarioType: 'Negative',
    action: 'del', partName: 'prod_part', groupName: 'non_existent', groupType: 'user',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-103', errMsg: 'Group not found' })
  },
  {
    testId: 'EKMS_Group_06',
    desc: 'Fail to add a group with special character (@) in name',
    scenarioType: 'Negative',
    action: 'add', partName: 'prod_part', groupName: 'group@test', groupType: 'user',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-301', errMsg: "Validation Failed: Field 'groupName' must be alphanumeric and between 4 and 50 characters." })
  },
  {
    testId: 'EKMS_Group_07',
    desc: 'Fail to add a group with hyphen in name',
    scenarioType: 'Negative',
    action: 'add', partName: 'prod_part', groupName: 'group-test', groupType: 'user',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-301', errMsg: "Validation Failed: Field 'groupName' must be alphanumeric and between 4 and 50 characters." })
  },
  {
    testId: 'EKMS_Group_08',
    desc: 'Fail to add a group with name shorter than 4 characters',
    scenarioType: 'Negative',
    action: 'add', partName: 'prod_part', groupName: 'grp', groupType: 'user',  // 3 chars — protected
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-301', errMsg: "Validation Failed: Field 'groupName' must be alphanumeric and between 4 and 50 characters." })
  },
  // --- POSITIVE ---
  {
    testId: 'EKMS_Group_09',
    desc: 'Add an object type group to a partition',
    scenarioType: 'Positive',
    action: 'add', partName: 'prod_part', groupName: 'objectGrpTest', groupType: 'object',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'New group added successfully' })
  },
  {
    testId: 'EKMS_Group_10',
    desc: 'Delete an object type group from a partition',
    scenarioType: 'Positive',
    action: 'del', partName: 'prod_part', groupName: 'objectGrpTest', groupType: 'object',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'Group deleted successfully' })
  },
  {
    testId: 'EKMS_Group_11',
    desc: 'Add a group with a long valid alphanumeric name',
    scenarioType: 'Positive',
    action: 'add', partName: 'prod_part', groupName: 'GroupLongValidName12345678',
    groupType: 'user',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'New group added successfully' })
  },
  // --- NEGATIVE ---
  {
    testId: 'EKMS_Group_12',
    desc: 'Fail to add a group with wrong admin password',
    scenarioType: 'Negative',
    action: 'add', partName: 'prod_part', groupName: 'validGroupName', groupType: 'user',
    forceAdminPswrd: 'wrong_pass',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-104', errMsg: 'Authentication Failed: Incorrect partition admin password' })
  },
  {
    testId: 'EKMS_Group_13',
    desc: 'Fail to delete group with mismatched group type (user_group as object)',
    scenarioType: 'Negative',
    action: 'del', partName: 'prod_part', groupName: 'user_group', groupType: 'object',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-145', errMsg: 'Group type not matched. Actual: user but in Request: object' })
  },
  // --- POSITIVE ---
  {
    testId: 'EKMS_Group_14',
    desc: 'List all groups to verify group inventory',
    scenarioType: 'Positive',
    action: 'list', partName: 'prod_part', groupName: '', groupType: '',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'Groups listed successfully' })
  },
  {
    testId: 'EKMS_Group_15',
    desc: 'Add a group with a number-only valid alphanumeric name',
    scenarioType: 'Positive',
    action: 'add', partName: 'prod_part', groupName: '12345678', groupType: 'user',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'New group added successfully' })
  }
];

groupScenarios.forEach(sc => {
  const txn = randTxn();
  const req = { txn, action: sc.action, partName: sc.partName };
  if (sc.groupName) req.groupName = sc.groupName;
  if (sc.groupType) req.groupType = sc.groupType;
  if (sc.action !== 'list') {
    req.saUsername = '.env:SA_USERNAME';
    req.saPswrd = '.env:SA_PASSWORD';
    req.adminPswrd = sc.forceAdminPswrd !== undefined ? sc.forceAdminPswrd : '.env:ADMIN_PASSWORD';
  }

  groupRows.push([
    sc.testId,
    sc.desc,
    sc.scenarioType,
    JSON.stringify(req),
    sc.status,
    JSON.stringify(sc.expectedRes(txn))
  ]);
});

// =============================================================================
// --- 4. Modify Owner Sheet (15 scenarios) ---
// =============================================================================
const ownerRows = [];

const ownerScenarios = [
  // --- POSITIVE ---
  {
    testId: 'EKMS_Owner_01',
    desc: 'Add a new partition owner successfully',
    scenarioType: 'Positive',
    action: 'add', partName: 'prod_part', userName: 'userTest456', pswrd: 'Pass!23',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'New owner added successfully' })
  },
  {
    testId: 'EKMS_Owner_02',
    desc: 'Delete an existing partition owner successfully',
    scenarioType: 'Positive',
    action: 'del', partName: 'prod_part', userName: 'userTest456', pswrd: '',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'Owner deleted successfully' })
  },
  {
    testId: 'EKMS_Owner_03',
    desc: 'Verify partition owner credentials successfully',
    scenarioType: 'Positive',
    action: 'check', partName: 'prod_part', userName: 'userVerify789', pswrd: 'Pass!23',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'Owner verified successfully' })
  },
  // --- NEGATIVE ---
  {
    testId: 'EKMS_Owner_04',
    desc: 'Fail to add a duplicate owner (already_exists sentinel)',
    scenarioType: 'Negative',
    action: 'add', partName: 'prod_part', userName: 'already_exists', pswrd: 'Pass!23',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-102', errMsg: 'Owner already exists' })
  },
  {
    testId: 'EKMS_Owner_05',
    desc: 'Fail to delete a non-existent owner',
    scenarioType: 'Negative',
    action: 'del', partName: 'prod_part', userName: 'non_existent', pswrd: '',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-103', errMsg: 'Owner not found' })
  },
  {
    testId: 'EKMS_Owner_06',
    desc: 'Fail to add owner with space in username',
    scenarioType: 'Negative',
    action: 'add', partName: 'prod_part', userName: 'user name', pswrd: 'Pass!23',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-301', errMsg: "Validation Failed: Field 'userName' must be alphanumeric and between 4 and 50 characters." })
  },
  {
    testId: 'EKMS_Owner_07',
    desc: 'Fail to add owner with hyphen in username',
    scenarioType: 'Negative',
    action: 'add', partName: 'prod_part', userName: 'user-name', pswrd: 'Pass!23',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-301', errMsg: "Validation Failed: Field 'userName' must be alphanumeric and between 4 and 50 characters." })
  },
  {
    testId: 'EKMS_Owner_08',
    desc: 'Fail to add owner with username shorter than 4 characters',
    scenarioType: 'Negative',
    action: 'add', partName: 'prod_part', userName: 'usr', pswrd: 'Pass!23',  // 3 chars — protected
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-301', errMsg: "Validation Failed: Field 'userName' must be alphanumeric and between 4 and 50 characters." })
  },
  // --- NEGATIVE ---
  {
    testId: 'EKMS_Owner_09',
    desc: 'Fail to check owner credentials when password field is missing',
    scenarioType: 'Negative',
    action: 'check', partName: 'prod_part', userName: 'userVerify789', pswrd: '',  // missing pswrd
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-006', errMsg: 'Missing pswrd field' })
  },
  {
    testId: 'EKMS_Owner_10',
    desc: 'Fail to add owner to a non-existent partition',
    scenarioType: 'Negative',
    action: 'add', partName: 'not_found_part', userName: 'newOwner999', pswrd: 'Pass!23',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-134', errMsg: 'Partition not found.' })
  },
  {
    testId: 'EKMS_Owner_11',
    desc: 'Fail to add owner with incorrect admin password',
    scenarioType: 'Negative',
    action: 'add', partName: 'prod_part', userName: 'ownerWrongPass', pswrd: 'Pass!23',
    forceAdminPswrd: 'wrong_pass',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-104', errMsg: 'Authentication Failed: Incorrect partition admin password' })
  },
  // --- POSITIVE ---
  {
    testId: 'EKMS_Owner_12',
    desc: 'Activate a partition owner account',
    scenarioType: 'Positive',
    action: 'act', partName: 'prod_part', userName: 'ownerActivate1', pswrd: '',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'Owner activated successfully' })
  },
  {
    testId: 'EKMS_Owner_13',
    desc: 'Deactivate a partition owner account',
    scenarioType: 'Positive',
    action: 'dis', partName: 'prod_part', userName: 'ownerDeactivate', pswrd: '',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'Owner deactivated successfully' })
  },
  {
    testId: 'EKMS_Owner_14',
    desc: 'Add a partition owner with a long valid alphanumeric username',
    scenarioType: 'Positive',
    action: 'add', partName: 'prod_part', userName: 'userLongValidName12345', pswrd: 'Pass!23',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'New owner added successfully' })
  },
  {
    testId: 'EKMS_Owner_15',
    desc: 'Add a partition owner with a number-only valid username',
    scenarioType: 'Positive',
    action: 'add', partName: 'prod_part', userName: '12345678', pswrd: 'Pass!23',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'New owner added successfully' })
  }
];

ownerScenarios.forEach(sc => {
  const txn = randTxn();
  const req = { txn, action: sc.action, partName: sc.partName, userName: sc.userName };
  if (sc.pswrd) req.pswrd = sc.pswrd;
  req.saUsername = '.env:SA_USERNAME';
  req.saPswrd = '.env:SA_PASSWORD';
  req.adminPswrd = sc.forceAdminPswrd !== undefined ? sc.forceAdminPswrd : '.env:ADMIN_PASSWORD';

  ownerRows.push([
    sc.testId,
    sc.desc,
    sc.scenarioType,
    JSON.stringify(req),
    sc.status,
    JSON.stringify(sc.expectedRes(txn))
  ]);
});

// =============================================================================
// --- 5. Modify Privileges Sheet (15 scenarios) ---
// =============================================================================
const privilegeRows = [];

const privilegeScenarios = [
  // --- POSITIVE ---
  {
    testId: 'EKMS_Privilege_01',
    desc: 'Grant privileges between valid source and target groups',
    scenarioType: 'Positive',
    action: 'add', partName: 'prod_part', srcgrp: 'sourceGrp789', tgtgrp: 'targetGrp321',
    prvlgName: 'create,delete',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'Privileges updated successfully between source group: sourceGrp789 and target group: targetGrp321' })
  },
  {
    testId: 'EKMS_Privilege_02',
    desc: 'Revoke privileges between source and target groups',
    scenarioType: 'Positive',
    action: 'del', partName: 'prod_part', srcgrp: 'sourceGrp789', tgtgrp: 'targetGrp321',
    prvlgName: 'create,delete',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'Privileges deleted successfully between source group: sourceGrp789 and target group: targetGrp321' })
  },
  {
    testId: 'EKMS_Privilege_03',
    desc: 'List all active privileges between source and target groups',
    scenarioType: 'Positive',
    action: 'list', partName: 'prod_part', srcgrp: 'sourceGrp789', tgtgrp: 'targetGrp321',
    prvlgName: '',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'All privileges listed successfully between source group: sourceGrp789 and target group: targetGrp321' })
  },
  // --- NEGATIVE ---
  {
    testId: 'EKMS_Privilege_04',
    desc: 'Fail to grant duplicate privileges (already_exists sentinel)',
    scenarioType: 'Negative',
    action: 'add', partName: 'prod_part', srcgrp: 'already_exists', tgtgrp: 'targetGrp321',
    prvlgName: 'create,delete',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-102', errMsg: 'Privileges already exist' })
  },
  {
    testId: 'EKMS_Privilege_05',
    desc: 'Fail to revoke privileges for a non-existent source group',
    scenarioType: 'Negative',
    action: 'del', partName: 'prod_part', srcgrp: 'non_existent', tgtgrp: 'targetGrp321',
    prvlgName: 'create,delete',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-103', errMsg: 'Privileges not found' })
  },
  {
    testId: 'EKMS_Privilege_06',
    desc: 'Fail to grant privileges with underscore in source group name',
    scenarioType: 'Negative',
    action: 'add', partName: 'prod_part', srcgrp: 'src_grp', tgtgrp: 'targetGrp321',
    prvlgName: 'create',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-301', errMsg: "Validation Failed: Field 'srcgrp' must be alphanumeric and between 4 and 50 characters." })
  },
  {
    testId: 'EKMS_Privilege_07',
    desc: 'Fail to grant privileges with hyphen in target group name',
    scenarioType: 'Negative',
    action: 'add', partName: 'prod_part', srcgrp: 'sourceGrp789', tgtgrp: 'tgt-grp',
    prvlgName: 'create',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-301', errMsg: "Validation Failed: Field 'tgtgrp' must be alphanumeric and between 4 and 50 characters." })
  },
  {
    testId: 'EKMS_Privilege_08',
    desc: 'Fail to grant privileges with source group name shorter than 4 characters',
    scenarioType: 'Negative',
    action: 'add', partName: 'prod_part', srcgrp: 'src', tgtgrp: 'targetGrp321',  // 3 chars — protected
    prvlgName: 'create',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-301', errMsg: "Validation Failed: Field 'srcgrp' must be alphanumeric and between 4 and 50 characters." })
  },
  {
    testId: 'EKMS_Privilege_09',
    desc: 'Fail to grant privileges with target group name shorter than 4 characters',
    scenarioType: 'Negative',
    action: 'add', partName: 'prod_part', srcgrp: 'sourceGrp789', tgtgrp: 'tgt',  // 3 chars — protected
    prvlgName: 'create',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-301', errMsg: "Validation Failed: Field 'tgtgrp' must be alphanumeric and between 4 and 50 characters." })
  },
  {
    testId: 'EKMS_Privilege_10',
    desc: 'Fail to grant privileges with an invalid privilege name',
    scenarioType: 'Negative',
    action: 'add', partName: 'prod_part', srcgrp: 'sourceGrp789', tgtgrp: 'targetGrp321',
    prvlgName: 'invalid_priv',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-008', errMsg: 'Invalid privilege name: invalid_priv' })
  },
  {
    testId: 'EKMS_Privilege_11',
    desc: 'Fail to grant privileges with wrong admin password',
    scenarioType: 'Negative',
    action: 'add', partName: 'prod_part', srcgrp: 'sourceGrp789', tgtgrp: 'targetGrp321',
    prvlgName: 'create', forceAdminPswrd: 'wrong_pass',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-104', errMsg: 'Authentication Failed: Incorrect partition admin password' })
  },
  {
    testId: 'EKMS_Privilege_12',
    desc: 'Fail to grant privileges on a non-existent partition',
    scenarioType: 'Negative',
    action: 'add', partName: 'not_found_part', srcgrp: 'sourceGrp789', tgtgrp: 'targetGrp321',
    prvlgName: 'create',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-134', errMsg: 'Partition not found.' })
  },
  {
    testId: 'EKMS_Privilege_13',
    desc: 'Fail to grant privileges when target group is not an object group',
    scenarioType: 'Negative',
    action: 'add', partName: 'prod_part', srcgrp: 'sourceGrp789', tgtgrp: 'not_an_object_group',
    prvlgName: 'create',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-234', errMsg: "Group type is not 'object': Target group must be of type object" })
  },
  {
    testId: 'EKMS_Privilege_14',
    desc: 'Fail to grant privileges when source group is not a user group',
    scenarioType: 'Negative',
    action: 'add', partName: 'prod_part', srcgrp: 'not_a_user_group', tgtgrp: 'targetGrp321',
    prvlgName: 'create',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '-1', errCode: 'EKMS-235', errMsg: "Group type is not 'user': Source group must be of type user" })
  },
  // --- POSITIVE ---
  {
    testId: 'EKMS_Privilege_15',
    desc: 'List all privileges to verify privilege inventory',
    scenarioType: 'Positive',
    action: 'list', partName: 'prod_part', srcgrp: 'sourceGrp789', tgtgrp: 'targetGrp321',
    prvlgName: '',
    status: 200,
    expectedRes: (txn) => ({ txn, status: '1', succMsg: 'All privileges listed successfully between source group: sourceGrp789 and target group: targetGrp321' })
  }
];

privilegeScenarios.forEach(sc => {
  const txn = randTxn();
  const req = { txn, action: sc.action, partName: sc.partName, srcgrp: sc.srcgrp, tgtgrp: sc.tgtgrp };
  if (sc.prvlgName) req.prvlgName = sc.prvlgName;
  req.saUsername = '.env:SA_USERNAME';
  req.saPswrd = '.env:SA_PASSWORD';
  req.adminPswrd = sc.forceAdminPswrd !== undefined ? sc.forceAdminPswrd : '.env:ADMIN_PASSWORD';

  privilegeRows.push([
    sc.testId,
    sc.desc,
    sc.scenarioType,
    JSON.stringify(req),
    sc.status,
    JSON.stringify(sc.expectedRes(txn))
  ]);
});

// =============================================================================
// Assemble and write sheets
// =============================================================================
const addSheet = (sheetName, rows) => {
  const data = [headers, ...rows];
  const ws = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(workbook, ws, sheetName);
};

addSheet('IP_Whitelist_Blacklist', ipRows);
addSheet('Add_Delete_Partition', partRows);
addSheet('Modify_Group', groupRows);
addSheet('Modify_Owner', ownerRows);
addSheet('Modify_Privileges', privilegeRows);

const destDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}
const destPath = path.resolve(destDir, 'EKMS_API_Endpoint.xlsx');
xlsx.writeFile(workbook, destPath);

const totalScenarios = ipRows.length + partRows.length + groupRows.length + ownerRows.length + privilegeRows.length;
console.log(`✅ EKMS_API_Endpoint.xlsx created with 5 sheets and ${totalScenarios} scenarios at: ${destPath}`);
console.log(`   IP_Whitelist_Blacklist: ${ipRows.length} | Add_Delete_Partition: ${partRows.length} | Modify_Group: ${groupRows.length} | Modify_Owner: ${ownerRows.length} | Modify_Privileges: ${privilegeRows.length}`);
