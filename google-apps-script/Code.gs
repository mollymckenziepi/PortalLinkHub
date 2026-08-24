/**
 * Backend for OC Portal Link Hub Site click tracking.
 * Deploy this bound to a Google Sheet as a Web App (see README.md for steps).
 * It stores one row per link id with its running click count in a sheet named "Clicks".
 */

function doGet(e) {
  return jsonResponse(getClickCounts());
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const body = JSON.parse(e.postData.contents);
    const id = body && body.id;
    if (!id || typeof id !== 'string') {
      return jsonResponse({ error: 'Missing link id' });
    }

    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        rowIndex = i;
        break;
      }
    }

    let newCount;
    if (rowIndex === -1) {
      newCount = 1;
      sheet.appendRow([id, newCount]);
    } else {
      newCount = (Number(data[rowIndex][1]) || 0) + 1;
      sheet.getRange(rowIndex + 1, 2).setValue(newCount);
    }

    return jsonResponse({ id: id, clicks: newCount });
  } finally {
    lock.releaseLock();
  }
}

function getClickCounts() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const counts = {};
  for (let i = 1; i < data.length; i++) {
    const id = data[i][0];
    if (id) counts[id] = Number(data[i][1]) || 0;
  }
  return counts;
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Clicks');
  if (!sheet) {
    sheet = ss.insertSheet('Clicks');
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Link ID', 'Clicks']);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
