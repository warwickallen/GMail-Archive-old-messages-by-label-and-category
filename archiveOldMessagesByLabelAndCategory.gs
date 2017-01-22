// This code was based on John Day's example at https://www.johneday.com/422/time-based-gmail-filters-with-google-apps-script

function go() {
  var fname = "Archive old messages by label and category";
  var files = DriveApp.getFilesByName(fname);
  var spreadsheet;
  while ((typeof spreadsheet !== 'object') && files.hasNext())
  {
    try
    {
      spreadsheet = SpreadsheetApp.openById(files.next().getId());
    }
    catch (e)
    {
      Logger.log("WARNING: " + e.message)
    }
  }
  if (typeof spreadsheet !== 'object')
  {
    Logger.log("FATAL: Cannot find a Google speadsheet called '" + fname + "'.");
    return -1;
  }
  var count = archiveThreadsByLabel(getSheetData(spreadsheet, "label"));
  count += archiveThreadsByCategory(getSheetData(spreadsheet, "category"));
  Logger.log("INFO: Archived " + count + " threads.");
}

function getSheetData(spreadsheet, sheet_name)
{
  var data_array = spreadsheet.getSheetByName(sheet_name).getDataRange().getValues();
  data_array.shift();  // Remove the headings row.
  var data_object = new Object;
  data_array.forEach(function(datum) {data_object[datum[0]] = datum[1]});
  return data_object;
}

function archiveThreadsByLabel(minAgesInHours) {
  var blockSize = 50;
  var start = 0;
  var count = 0;

  while (1)
  {
    var threads = GmailApp.getInboxThreads(start, blockSize);
    if (threads.length < 1) break;
    start += threads.length;

    for (var label in minAgesInHours)
    {
      var maxTime = new Date();
      var localCount = 0;
      maxTime.setTime(maxTime.getTime() - minAgesInHours[label]*3600000);
      for (var i = 0; i < threads.length; i++)
        if (threads[i].getLastMessageDate() < maxTime)
        {
          var labels = threads[i].getLabels();
          for (var j = 0; j < labels.length; j++)
            if (labels[j].getName() == label)
            {
              Logger.log("INFO:\n    " + threads[i].getFirstMessageSubject() + "\n    " + threads[i].getLastMessageDate());
              threads[i].moveToArchive();
              localCount++;
              break;
            }
        }
      Logger.log("INFO: Archived " + localCount + " threads labelled '" + label + "' that are older than " + maxTime);
      count += localCount;
    }
    Utilities.sleep(1000);  // Google doesn't like it if GmailApp API calls are called too often in a short period of time.
  }
  return count;
}

function archiveThreadsByCategory(minAgesInHours) {
  var blockSize = 50;
  var count = 0;

  for (var category in minAgesInHours)
  {
    var start = 0;
    var localCount = 0;
    var maxTime = new Date();
    maxTime.setTime(maxTime.getTime() - minAgesInHours[category]*3600000);
    var query = 'in:inbox category:' + category + ' before:' + maxTime.getFullYear() + '-' + (maxTime.getMonth() + 1) + '-' + (maxTime.getDate() + 1);
    while (1)
    {
      var threads = GmailApp.search(query, start, blockSize);
      if (threads.length < 1) break;
      start += threads.length;
      for (var i = 0; i < threads.length; i++)
        if (threads[i].getLastMessageDate() < maxTime)
        {
          Logger.log("\n    " + threads[i].getFirstMessageSubject() + "\n    " + threads[i].getLastMessageDate());
          threads[i].moveToArchive();
          localCount++;
        }
      Utilities.sleep(1000);  // Google doesn't like it if GmailApp API calls are called too often in a short period of time.
    }
    Logger.log("INFO: Archived " + localCount + " threads categorisaed as '" + category + "' that are older than " + maxTime);
    count += localCount;
  }
  return count;
}
