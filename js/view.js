/* global Controller View mediator JiraHelper */
window.View = window.View || {}
var flag;
window.View.Main = (function () {
  var worklogDateInput,
    getWorklogButton,
    
   
    totalHoursSpan

  function init () {
    setLoadingStatus(true)

    Controller.LogController.init().then(() => {
      View.Table.init()
      flag = false
      getWorklogButton = document.getElementById('getWorklogButton')
      worklogInput = document.getElementById('worklog')
      //addWorklogsButton = document.getElementById('addWorklogs')
      //saveButton = document.getElementById('save')
      totalHoursSpan = document.getElementById('totalHours')

      worklogDateInput = document.getElementById('worklogDate')
      // initialize date with today's date
      worklogDateInput.value = formatDate(new Date())

      mediator.on('modal.totalHours.update', totalHours => {
        totalHoursSpan.innerText =
                    parseFloat(totalHours).toFixed(2) + 'h'
      })

      mediator.on('view.table.new-worklog.changed', () => {
        persistUnsavedData()
          .then(() => {
            console.log('persisted data locally.')
          })
      })

     mediator.on('view.table.worklog.changed', () => {
        persistUnsavedData()
          .then(() => {
            console.log('persisted data locally.')
          })
      })

      mediator.on('view.table.new-worklog.deleted', () => {
        persistUnsavedData()
          .then(() => {
            console.log('persisted data locally (deletion).')
          })
      })

      getWorklogButton.addEventListener('click', () => {
        flag = true
        setLoadingStatus(true)
        persistUnsavedData()
          .then(getWorklogItemsFromDate)
          .then((data) => {
              
          }).catch(error => {
            console.warn(error)
          }).then(() => {
            setLoadingStatus(false)
          })
      })

      /*addWorklogsButton.addEventListener('click', () => {
        setLoadingStatus(true)
        Controller.LogController.bulkInsert(worklogInput.value).then(
          () => {
            worklogInput.value = ''
            mediator.trigger('view.table.new-worklog.changed', {})
            setLoadingStatus(false)
          }
        )
      })*/

     /* saveButton.addEventListener('click', () => {
        setLoadingStatus(true)
        var items = View.Table.getWorklogItems()
        Controller.LogController.save(items, worklogDateInput.value)
          .then(getWorklogItemsFromDate)
          .then(() => {
            alert('Worklog saved.')
          }).catch(error => {
            alert('Some items were not saved. Make sure the Jira numbers exist, and you are logged in Jira.')
            console.warn(error)
          }).then(() => {
            setLoadingStatus(false)
          })
      })*/

      /*worklogDateInput.addEventListener(
        'input',
        () => {
          console.log('date changed: ' + worklogDateInput.value)
          setLoadingStatus(true)
          getWorklogItemsFromDate().then(() => {

          }).catch(error => {
            console.warn(error)
          }).then(() => {
            setLoadingStatus(false)
          })
        },
        true
      )*/

      getWorklogItemsFromDate().then(() => {

      }).catch(error => {
        console.warn(error)
      }).then(() => {
        setLoadingStatus(false)
      })
    })
      .catch(() => {
        document.getElementsByClassName('container')[0].classList.add('hidden')
        document.getElementsByClassName('error_status')[0].classList.remove('hidden')
        alert('Something went wrong. Please go to \'Options\' and make sure you are logged in Jira, and the Jira URL is correct.')
        setLoadingStatus(false)
      })
  }

  function persistUnsavedData () {
    var items = View.Table.getWorklogItems()
    
    return Controller.LogController.persistUnsavedData(worklogDateInput.value, items)
  }

  function getWorklogItemsFromDate () {
    
    var promise = Controller.LogController.getWorklogsByDay(
      worklogDateInput.value
    )
    promise
      .then((data) => {  })
      .catch(error => {
        alert(`Something went wrong.\n\n${error}`)
      })
    return promise
  }

  function formatDate (date) {
    var d = date
    var month = '' + (d.getMonth() + 1)
    var day = '' + d.getDate()
    var year = d.getFullYear()

    if (month.length < 2) month = '0' + month
    if (day.length < 2) day = '0' + day

    return [year, month, day].join('-')
  }

  function setLoadingStatus (isLoading) {
    if (isLoading) {
      document.getElementById('loading').classList.remove('hidden')
    } else {
      document.getElementById('loading').classList.add('hidden')
    }
  }

  return {
    init: init,
    setLoadingStatus: setLoadingStatus
  }
})()

window.View.Table = (function () {
  var table, tbody
  var originalWorklogItems = []

  var worklogTableRowTemplate = `
    <tr class="worklog {{status-class}}" data-status="{{status}}" data-id="{{logId}}">
        <td class="table-line jira-number-column-item">
            <input name="jira" type="text" value="{{jiraNumber}}" class="jira-number-input" />
        </td>
        <td class="table-line time-spent-column-item">
            <input name="timeSpent" type="text" value="{{timeSpent}}" pattern="(\d+[m]|\d+[h](?:\s\d+[m])?)" class="time-spent-input" />
        </td>
        <td class="table-line comment-column-item">
            <input name="comment" type="text" value="{{comment}}" class="comment-input" />
        </td>
        <td class="table-line action-column-item" style="text-align:center; padding-top:20px">
            
            <a target="_blank" href="{{jiraUrl}}" class='open-link-button {{link-disabled}}'></a>
        </td>
    </tr>`

  var statusClassList = {
    saved: 'worklog--saved',
    invalid: 'worklog--invalid',
    edited: 'worklog--edited',
    deleted: 'worklog--deleted'
  }

  function getStatusClass (status) {
    return statusClassList[status]
  }

  function addRow (worklogItem) {
    var row = worklogTableRowTemplate
      .replace('{{jiraNumber}}', worklogItem.jira)
      .replace('{{timeSpent}}', worklogItem.timeSpent)
      .replace('{{comment}}', worklogItem.comment)
      .replace('{{status}}', worklogItem.status)
      .replace('{{logId}}', worklogItem.logId)
      .replace('{{status-class}}', getStatusClass(worklogItem.status))
      .replace('{{jiraUrl}}', worklogItem.jiraUrl)
      .replace('{{link-disabled}}', worklogItem.jiraUrl ? '' : 'link-disabled')
    tbody.innerHTML += row
  }

  function clearRows () {
    var newTbody = document.createElement('tbody')
    tbody.parentNode.replaceChild(newTbody, tbody)
    tbody = newTbody
  }

  function populateWorklogTable (worklogItems) {
    clearRows()

    console.log("populateworklogTable", worklogItems);

    for (var i = 0; i < worklogItems.length; i++) {
      var worklogItem = worklogItems[i]
      updateJiraUrl(worklogItem)
      addRow(worklogItem)
    }
  }

  function getWorklogFromRow (row) {
    var status = row.getAttribute('data-status')
    var logId = row.getAttribute('data-id')
    var jira = row.querySelector('[name=jira]').value
    var timeSpent = row.querySelector('[name=timeSpent]').value
    var comment = row.querySelector('[name=comment]').value
    // var jira = row.get
    // ...
    return {
      status: status,
      jira: jira,
      timeSpent: timeSpent,
      comment: comment,
      logId: logId
    }
  }

  function validateInput (worklog, row) {
    var invalidFields = Controller.LogController.getInvalidFields(worklog)
    updateWorklogRowInputStatus(row, invalidFields)
  }

  function updateWorklogRowInputStatus (row, invalidFields) {
    var inputs = row.querySelectorAll('input[type=text]')
    inputs.forEach(input => {
      input.classList.remove('input--invalid')
    })
    if (invalidFields && invalidFields.length) {
      invalidFields.forEach(invalidFieldName => {
        row.querySelector(`[name=${invalidFieldName}]`).classList.add('input--invalid')
      })
    }
  }

  function getWorklogItems () {
    var items = []

    for (var i = 0, row; (row = tbody.rows[i]); i++) {
      items.push(getWorklogFromRow(row))
    }
    return items
  }

  function updateWorklogRowStatus (row, newStatus) {
    var newStatusClass = getStatusClass(newStatus)
    row.classList.remove('worklog--saved')
    row.classList.remove('worklog--edited')
    row.classList.remove('worklog--deleted')
    row.classList.add(newStatusClass)
    row.setAttribute('data-status', newStatus)
  }

  function isEqual (worklog1, worklog2) {
    return worklog1.jira === worklog2.jira &&
            worklog1.comment === worklog2.comment &&
            worklog1.timeSpent === worklog2.timeSpent
  }

  function updateJiraUrl (worklog) {
    worklog.jiraUrl = JiraHelper.getJiraUrl(worklog.jira)
  }

  function updateJiraUrlLink (url, row) {
    var link = row.querySelector('a.open-link-button')
    if (url) {
      link.href = url
      link.classList.remove('link-disabled')
    } else {
      link.classList.add('link-disabled')
    }
  }

  function worklogChanged (e) {
    var row = e.srcElement.parentElement.parentElement
    var worklog = getWorklogFromRow(row)
    validateInput(worklog, row)
    updateJiraUrl(worklog)
    updateJiraUrlLink(worklog.jiraUrl, row)
    if (worklog.status !== 'new') {
      changeStatusForUpdate(row, worklog)
      mediator.trigger('view.table.worklog.changed', worklog)
    } else {
      mediator.trigger('view.table.new-worklog.changed', worklog)
    }
  }

  function changeStatusForUpdate (row, worklog) {
    var originalWorklog = originalWorklogItems.filter(item => {
      return item.logId === worklog.logId
    })[0]
    if (isEqual(originalWorklog, worklog)) {
      updateWorklogRowStatus(row, 'saved')
    } else {
      updateWorklogRowStatus(row, 'edited')
    }
  }

  function deleteRow (row) {
    tbody.removeChild(row)
  }

  function worklogDeleted (e) {
    var row = e.srcElement.parentElement.parentElement
    var worklog = getWorklogFromRow(row)

    if (worklog.status === 'new') {
      // just delete the row
      deleteRow(row)
      mediator.trigger('view.table.new-worklog.deleted', worklog)
    } else {
      // mark existing item for deletion
      changeStatusForDeletion(row, worklog)
    }
  }

  function changeStatusForDeletion (row, worklog) {
    if (worklog.status === 'deleted') {
      updateWorklogRowStatus(row, 'saved')
      changeStatusForUpdate(row, worklog)
    } else {
      updateWorklogRowStatus(row, 'deleted')
    }
  }

  function configureInputListeners () {
    var inputs = tbody.querySelectorAll('input[type=text]')

    inputs.forEach(input => {
      input.removeEventListener('input', worklogChanged)
      input.addEventListener('input', worklogChanged)
    })

    var deleteButtons = tbody.querySelectorAll('a.delete-button')

    deleteButtons.forEach(deleteButton => {
      deleteButton.removeEventListener('click', worklogDeleted)
      deleteButton.addEventListener('click', worklogDeleted)
    })
  }

  function init () {
    table = document.getElementById('worklog-items')
    tbody = table.getElementsByTagName('tbody')[0]

    mediator.on('model.workloglist.updated', worklogItems => {
      originalWorklogItems = worklogItems
      populateWorklogTable(worklogItems)
      configureInputListeners()

      //flag check
      if(flag == true){
        var i = -1;
        var text = ""
        document.getElementById('worklog').value = ""
       /* for (let i = 0, p = worklogItems[i].step; i < worklogItems.length; i++) {
          p = p.then(function(value){
            setTimeout(function () {
              console.log(value);
          }, Math.random() * 1000)
          });
              
          
      }*/


      promises = [];
        worklogItems.forEach(item=>{
          //console.log("item step", item.step.);
          
          p = item.step
          promises.push(p)
          /*.then(function(value){
          i++;
          if(i != 0){
            text += '\n<<<<<<<<<<<<<<<<<<<<<\n\n'
          }
            //make the general report template
            text += 'Task Name: ' + item.jira + '\n'
                 + '======================\n'
                 + 'Time Spent: ' + item.timeSpent + 's\n'
                 + 'Status: ' + value + '\n'
                 + '======================\n'
                 + 'Work done: ' + item.comment + '\n'
                 
                 document.getElementById('worklog').value += text
                 //var temp = (val + text)
                 //document.getElementById('worklog').value = temp
          })*/
          
        })
        
        Promise.all(promises).then(results=>{
          var index = -1
          var text = ""
          var totalTime = 0
          results.forEach(result=>{
            index ++
            
            if (index != 0){
              text += '\n<<<<<<<<<<<<<<<<<<<<<\n\n'
            }
            //make the general report template
            totalTime += parseFloat(worklogItems[index].timeSpent)
            text += 'Task Name: ' + worklogItems[index].jira + '\n'
                 + '======================\n'
                 + 'Time Spent: ' + worklogItems[index].timeSpent + 's\n'
                 + 'Status: ' + result + '\n'
                 + '======================\n'
                 + 'Work done: ' + worklogItems[index].comment + '\n'
          })
          text += "\n\n\n"
          text += 'Total Time Worked Today: '+ totalTime + 'hrs'
          document.getElementById('worklog').value += text
        })
      }
    })
    
  }

  return {
    init: init,
    addRow: addRow,
    deleteRow: deleteRow,
    clearRows: clearRows,
    populateWorklogTable: populateWorklogTable,
    getWorklogItems: getWorklogItems
  }
})()
