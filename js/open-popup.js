/* global chrome */
var popupWindow = window.open(
  chrome.extension.getURL('popup.html'),
  'Jira Worklog Tool',
  'width=800,height=1000'
)
popupWindow.focus()
window.close()
