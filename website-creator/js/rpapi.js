
var credentials;
var secretKey;
var accessKey;
var sessionId;
var connect;
var rpListTable;
var rpList;
var selectedRP;
var selectedRPId;
var queueList;
var timerID;
var dlgSourceAccessKey, dlgSourceSecretKey, dlgSourceRegion, dlgInstanceId;
const GCREATE = 'CREATE';
const GMODIFY = 'MODIFY';
const GVOICE = 'VOICE';
const GCHAT = 'CHAT';
const GSTANDARD = 'STANDARD';

// allowed will be CREATE and MODIFY
var currentOperation = GCREATE;

$( document ).ready(function() {
    if (!checkCookie()) {
        setAWSConfig(dlgSourceAccessKey, dlgSourceSecretKey, dlgSourceRegion);
        setupAll();
    } else {
        setupAll();
        $( "#configDialog" ).dialog( "open" );
    }
});

function setupAll() {
    loadConnectAPIs();
    $( "#createTabs" ).tabs();    

    $("#modifyRP").click(() => {
        currentOperation=GMODIFY;
        clear_form_elements('#rpAddQueue');
        clear_form_elements('#rpDetailsNew');
        $("#tblRPQueueList tbody").empty();
        $("#btnCreateRP").hide();
        $("#btnModifyRP").show();
        $("#btnModifyRPConcurrency").show();
        $("#btnModifyRPDefaultOBQ").show();
        $( "#manageRPdialog" ).dialog( "open" );
        populateRPDetails(selectedRPId);
    });
    
    $("#btnModifyRP").click(() => {
        modifyRoutingProfileNameDesc(selectedRPId);
    });
    
    $("#btnModifyRPConcurrency").click(() => {
        modifyRoutingProfileConcurrency(selectedRPId);
    });
                    
    $("#btnModifyRPDefaultOBQ").click(() => {
        modifyRoutingProfileDefaultQueue(selectedRPId);
    });
        
    $("#listRP").click(() => {
        getListRoutingProfiles();
    });

    $("#createRP").click(() => {
        currentOperation=GCREATE;
        clear_form_elements('#rpAddQueue');
        clear_form_elements('#rpDetailsNew');
        $("#tblRPQueueList tbody").empty();
        populateQueueList("#outBoundQueueList");
        $("#btnCreateRP").show();
        $("#btnModifyRP").hide();
        $("#btnModifyRPConcurrency").hide();
        $("#btnModifyRPDefaultOBQ").hide();        
        $( "#manageRPdialog" ).dialog( "open" );
    });
    
    $("#describeRP").click(() => {
        describeRP(selectedRPId);
    });
    
    $("#deleteRP").click(() => {
        $( "#confirmDialog" ).dialog( "open" );
    });
    $("#btnCreateRP").click(() => {
        createRP();
        $( "#manageRPdialog" ).dialog( "close" );
    });
    $("#btnPrefill").click(() => {
        fillInstanceDetails();
    });
    
    $("#awsConfiguration").click(() => {
        $( "#configDialog" ).dialog( "open" );
    });
    
    $("#btnConfiguration").click(() => {
        if (saveCookie()) {
            $( "#configDialog" ).dialog( "close" );
        } else {
            $( "#configDialog" ).dialog( "open" );
        }
    });
       
    $("#dialog").dialog({
        autoOpen: false,
        modal: true
      });
    
    $("#manageRPdialog").dialog({
        autoOpen: false,
        width: 1100,
        modal: true,
        resizable: false,
        height: "auto"        
        
    });
    
    $("#resultDialog").dialog({
        autoOpen: false,
        modal: true
    });

    
    $('#configDialog').dialog({
        autoOpen: false,
        width: 850,
        modal: true,
        resizable: false,
        height: "auto"        
    });

    $('#addQueueDialog').dialog({
        autoOpen: false,
        modal: true,
        resizable: false,
        width: "auto",
        height: "auto",
        buttons: {
            "Yes": function() {
              $( this ).dialog( "close" );
              addRoutingProfile(selectedRPId);
            },
            Cancel: function() {
              $( this ).dialog( "close" );
            }
        }
    });
    
    
    $( "#confirmDialog" ).dialog({
        autoOpen: false,
        resizable: false,
        height: "auto",
        width: 400,
        modal: true,
        buttons: {
          "Yes": function() {
            $( this ).dialog( "close" );
            deleteRoutingProfile(selectedRPId);
          },
          Cancel: function() {
            $( this ).dialog( "close" );
          }
        }
    });        
    
    rpListTable = $('#rpListTable').DataTable({
        columnDefs: [
            {
                targets: -1,
                className: 'dt-body-right'
            }
          ],        
        columns: [{title: "Name"},{title: "Description"},{title: "# of queues associated"}, {title: "Outbound queue"}],
        select: true,
        paging: false,
        info: false,
        searching: false
    });
    
    rpListTable.on( 'select', function ( e, dt, type, indexes ) {
        if ( type === 'row' ) {
            selectedRP = rpListTable.rows( indexes ).data()[0][0];
            $('#selectedRP').val(selectedRP);
            for (var i=0; i< rpList.RoutingProfileSummaryList.length; i++) {
                if (selectedRP === rpList.RoutingProfileSummaryList[i].Name) {
                    selectedRPId = rpList.RoutingProfileSummaryList[i].Id;
                    break;
                }
            }
        }
    });
    getListRoutingProfiles();
        
}

async function createRP() {
    try {
        handleWindow(true, '');
        // name, description, defaultOutboundQueueId, queues, mediaConcurrencies
        var queues = [];
        var mediaConcurrencies = [];
        
        if($('#chatChannel').is(":checked")) {
            if(parseInt($('#chatsPerAgent').val()) > 0) {
                var media = {
                    "Channel": GCHAT,
                    "Concurrency": $('#chatsPerAgent').val()
                };
                mediaConcurrencies.push(media);
            }
        }
        
        if ($('#voiceChannel').is(":checked")) {
            var media = {
                "Channel": GVOICE,
                "Concurrency": "1"
            };
            mediaConcurrencies.push(media);
        }

        $('#tblRPQueueList > tbody  > tr').each(function(index, tr) {
            var q = {};
            q['QueueReference'] = {};
               $(this).find('input').each (function(index2) {
                   var attributeName = $(this).attr('name');
                   console.log(attributeName, $(this).val());

                   switch(attributeName) {
                    case('chkVoice'):
                        if($(this).is(":checked")) {
                            q['QueueReference']['Channel'] = (GVOICE);
                        }
                        break;
                    case('chkChat'):
                        if($(this).is(":checked")) {
                            q['QueueReference']['Channel'] = (GCHAT);
                        }
                        break;
                    case('priority'):
                        q['Priority'] = $(this).val();
                        break;
                    case('delay'):
                        q['Delay'] = $(this).val();
                        break;
                    default:
                        break;
                }
               });

               $(this).find('select').each (function(index2) {
                   console.log($(this).attr('name'), $(this).val());
                   if($(this).attr('name') === 'rpQueue') {
                       q['QueueReference']['QueueId'] = $(this).val();
                   }
               });
               queues.push(q);
        });

        let resp = await createRoutingProfile(dlgInstanceId, $('#rpNameNew').val(), $('#rpDescription').val(), $('#outBoundQueueList').val(),
                queues, mediaConcurrencies);
        console.log(resp);
        getListRoutingProfiles();
        handleWindow(false, '');
    } catch(e) {
        console.log(e);
        handleWindow(false, '');
        showResults(e);
    }
}

async function modifyRoutingProfileNameDesc(profileId) {
    try {
        handleWindow(true, '');
        let resp = await updateRoutingProfileName(dlgInstanceId, profileId, $('#rpNameNew').val(), $('#rpDescription').val());
        console.log(resp);
        handleWindow(false, '');
    } catch(e) {
        console.log(e);
        handleWindow(false, '');
        showResults(e);
    }
}

async function modifyRoutingProfileDefaultQueue(profileId) {
    try {
        handleWindow(true, '');
        let resp = await updateRoutingProfileDefaultOutboundQueue(dlgInstanceId, profileId, $('#outBoundQueueList').val());
        console.log(resp);
        handleWindow(false, '');
    } catch(e) {
        console.log(e);
        handleWindow(false, '');
        showResults(e);
    }
}


async function modifyRoutingProfileConcurrency(profileId) {
    try {
        handleWindow(true, '');
        var mediaConcurrencies = [];
        
        if($('#chatChannel').is(":checked")) {
            if(parseInt($('#chatsPerAgent').val()) > 0) {
                var media = {
                    "Channel": GCHAT,
                    "Concurrency": $('#chatsPerAgent').val()
                }
                mediaConcurrencies.push(media);
            }
        }

        if($('#voiceChannel').is(":checked")) {
            var media = {
                "Channel": GVOICE,
                "Concurrency": "1"
            }
            mediaConcurrencies.push(media);
        }
        
        let resp = await updateRoutingProfileConcurrency(dlgInstanceId, profileId, mediaConcurrencies);
        console.log(resp);
        handleWindow(false, '');
    } catch(e) {
        console.log(e);
        handleWindow(false, '');
        showResults(e);
    }
}

function populateQueueList(ele, selected) {
    var ddl = $(ele);
    ddl.html('');
    for (var i=0; i < queueList.QueueSummaryList.length; i++) {
        if (queueList.QueueSummaryList[i].QueueType === 'STANDARD') {
            if (selected) {
                if (selected === queueList.QueueSummaryList[i].Id) {
                    ddl.append("<option value='" + queueList.QueueSummaryList[i].Id+ "' selected>" + queueList.QueueSummaryList[i].Name + "</option>");
                } else {
                    ddl.append("<option value='" + queueList.QueueSummaryList[i].Id+ "'>" + queueList.QueueSummaryList[i].Name + "</option>");
                }
            } else {
                ddl.append("<option value='" + queueList.QueueSummaryList[i].Id+ "'>" + queueList.QueueSummaryList[i].Name + "</option>");
            }
        }
            
    }
}

async function populateRPDetails(profileId) {
    try{
        let rp = await describeRoutingProfile(dlgInstanceId, profileId);
        console.log(rp);
        $('#rpNameNew').val(rp.RoutingProfile.Name);
        $('#rpDescription').val(rp.RoutingProfile.Description)
        for (var j=0; j<rp.RoutingProfile.MediaConcurrencies.length; j++) {
            var med = rp.RoutingProfile.MediaConcurrencies[j];
            if (med) {
                if (med.Channel === GCHAT) {
                    if(med.Concurrency > 0) {
                        $('#chatChannel').prop('checked', true);
                        $('#chatsPerAgent').val(med.Concurrency);
                    } else {
                        $('#chatChannel').prop('checked', false);
                        $('#chatsPerAgent').val(med.Concurrency);
                    }
                } else {
                    if(med.Concurrency > 0) {
                        $('#voiceChannel').prop('checked', true);
                    } else {
                        $('#voiceChannel').prop('checked', false);
                    }
                }
            }
        }
        populateQueueList('#outBoundQueueList', rp.RoutingProfile.DefaultOutboundQueueId);
        
        let rpq = await listRoutingProfileQueues(dlgInstanceId, profileId);
        console.log(rpq);
        var queueId="";
        $("#tblRPQueueList tbody").empty();
        var tbody = $('#tblRPQueueList').children('tbody');
        var table = tbody.length ? tbody : $('#tblRPQueueList');
        
        for(var j=0; j <rpq.RoutingProfileQueueConfigSummaryList.length; j++){
            var item = rpq.RoutingProfileQueueConfigSummaryList[j];
            console.log(item);
            queueId = item.QueueId;    
            var td = "<tr><td><input name='selectQueue' type='checkbox'></td>";
            td += "<td><select name='rpQueue'>"    ;
            for (var i=0; i < queueList.QueueSummaryList.length; i++) {
                if (queueList.QueueSummaryList[i].QueueType === 'STANDARD') {
                    if (queueId === queueList.QueueSummaryList[i].Id) {
                        td += "<option value='" + queueList.QueueSummaryList[i].Id+ "' selected>" + queueList.QueueSummaryList[i].Name + "</option>";
                    } else {
                        td += "<option value='" + queueList.QueueSummaryList[i].Id+ "'>" + queueList.QueueSummaryList[i].Name + "</option>";
                    }
                }
            }
            td += '</select></td>';
            if(item.Channel === GVOICE) {
                td += '<td><span><input name="chkVoice" type="checkbox" checked> Voice </span>';
            } else {
                td += '<td><span><input name="chkChat" type="checkbox" checked> Chat </span>';
            }
            td += '<td><input name="priority" type="text" placeholder="Priority" value=' + item.Priority +'></td>';
            td += '<td><input name="delay" type="text" placeholder="Delay"  value=' +  item.Delay+'></td>';
            var a = '<td><a href="" onclick="updatePriorityDelay(\'' + queueId + '\', \'' + item.Channel + '\');return false;">';
            a += 'Save' +'</></td>'
            td += a;
            
            td += '</tr>';
            table.append(td);
        }
    } catch(e) {
        console.log(e);
        showResults(e);
    }
    
}


async function addRoutingProfile() {
    try {
        var queueId = $('#addQueueList').val();
        var queues = [];
        var channels = [];
        var q = {};
        if($('#chkRPVoice').is(":checked")) {
            q['QueueReference'] = {};
            q['QueueReference']['QueueId'] =  queueId;
            q['QueueReference']['Channel'] = GVOICE;
            q['Priority'] =$('#rpPriority').val();
            q['Delay'] =$('#rpDelay').val();
            queues.push(q);
        }
        q = {};
        if($('#chkRPChat').is(":checked")) {
            q['QueueReference'] = {};
            q['QueueReference']['QueueId'] =  queueId;
            q['QueueReference']['Channel'] = GCHAT;
            q['Priority'] =$('#rpPriority').val();
            q['Delay'] =$('#rpDelay').val();
            queues.push(q);
        }

        if (currentOperation === GMODIFY) {
            await associateRoutingProfileQueues(dlgInstanceId, selectedRPId, queues);
        }
        
        var tbody = $('#tblRPQueueList').children('tbody');
        var table = tbody.length ? tbody : $('#tblRPQueueList');
        var td='';
        if ($('#chkRPVoice').is(":checked")) {
            td = getNewRowDetails(queueId, GVOICE);
            table.append(td);
        } 

        if ($('#chkRPChat').is(":checked")) {
            td = getNewRowDetails(queueId, GCHAT);
            table.append(td);
        } 
    } catch(e) {
        console.log(e);
        showResults(e);
    }
    
}

function getNewRowDetails(queueId, channel) {
    var td = "<tr><td><input name='selectQueue' type='checkbox'></td>";
    td += "<td><select name='rpQueue'>"    ;
    
    for (var i=0; i < queueList.QueueSummaryList.length; i++) {
        if ( queueList.QueueSummaryList[i].QueueType === GSTANDARD) {
            if (queueId === queueList.QueueSummaryList[i].Id) {
                td += "<option value='" + queueList.QueueSummaryList[i].Id+ "' selected>" + queueList.QueueSummaryList[i].Name + "</option>";
            } else {
                td += "<option value='" + queueList.QueueSummaryList[i].Id+ "'>" + queueList.QueueSummaryList[i].Name + "</option>";
            }
        }
    }
    td += '</select></td>';
    
    if (channel === GVOICE) {
        td += '<td><input name="chkVoice" type="checkbox" checked> Voice</td>';
    } 

    if (channel === GCHAT) {
        td += '<td><input name="chkChat" type="checkbox" checked> Chat</td>';
    } 

    td += '<td><input name="priority" type="text" placeholder="Priority" value="' + $('#rpPriority').val() + '"></td>';
    td += '<td><input name="delay" type="text" placeholder="delay"  value="' + $('#rpDelay').val() + '"></td>';
    if(currentOperation === GMODIFY) {
        var a = '<td><a href="" onclick="updatePriorityDelay(\'' + queueId + '\', \'' + channel + '\');return false;">';
        a += 'Save' +'</></td>'
        td += a;
    } else {
        td += '<td>-</td>'
    }
    
    td += '</tr>';
    return td;
}

function updatePriorityDelay(queueId, channel) {
    console.log(queueId);
    handleWindow(true, '');
    $('#tblRPQueueList > tbody  > tr').each(function(index, tr) {
        var rowQueueId ='';
        var priority = '';
        var delay = '';
        var foundMatch = false;
           $(this).find('select').each (function(index2) {
               rowQueueId = $(this).val();
           });
           if(rowQueueId === queueId){
               $(this).find('input').each (function(index2) {
                   if($(this).attr('name') === 'chkChat') {
                       if(channel === GCHAT)
                           foundMatch = true;
                   }
                   if($(this).attr('name') === 'chkVoice') {
                       if(channel === GVOICE)
                           foundMatch = true;
                   }
                   
                   if($(this).attr('name')==='priority') {
                       priority = $(this).val();
                   }
                   if($(this).attr('name')==='delay') {
                       delay = $(this).val();
                    }
               });
               if(rowQueueId === queueId && foundMatch) {
                    var q = {};
                    var queues =[];
                    q['QueueReference'] = {};
                    q['QueueReference']['QueueId'] =  queueId;
                    q['QueueReference']['Channel'] = channel;
                    q['Priority'] = priority;
                    q['Delay'] = delay;
                    queues.push(q);
                    updateRPDP(queues);
               }
           }
    });
    handleWindow(false, '');
    
}

async function updateRPDP(queues) {
    try{
        await updateRoutingProfileQueues(dlgInstanceId, selectedRPId, queues);    
    } catch (e) {
        console.log(e)
        showResults(e);
        handleWindow(false, '');
    }
    
}

function addQueue() {
    populateQueueList('#addQueueList');
    $( "#addQueueDialog" ).dialog( "open" );
}

async function removeQueue() {
    if (currentOperation === GCREATE) {
        if ($("#selectAllQueues").is(":checked")) {
            $("#tblRPQueueList tbody").empty();
        } else {
            // Check all the list boxes that are selected, remove the selected
            // queue/channel
            $('#tblRPQueueList > tbody  > tr').each(function(index, tr) { 
                var deleteMe = false;
                // if the checkbox is selected in the 1 column of row, then we
                // have to remove queue/channel from the routing profile
                // association
                $(this).find('input').each (function(index2) {
                    if(index2 === 0) {
                        console.log($(this).attr('name'), $(this).val());
                        if($(this).is(":checked"))
                            deleteMe = true;
                    }
                });
                if (deleteMe) {
                    $(this).remove();
                }
            });        
        }
    } else {
        var queues = [];
        
        if ($("#selectAllQueues").is(":checked")) {
            $("#tblRPQueueList tbody").empty();
        } else {
            $('#tblRPQueueList > tbody  > tr').each(function(index, tr) { 
                   var deleteMe = false;
                   var chkChat = false;
                   var chkVoice = false;
                   var queueId = "";
                   $(this).find('select').each (function(index2) {
                       queueId = $(this).val();
                   });
                   $(this).find('input').each (function(index2) {
                       if($(this).attr('name')==='selectQueue') {
                           if($(this).is(":checked"))
                               deleteMe = true;
                       }
                       if(deleteMe) {
                           if($(this).attr('name')==='chkVoice') {
                               if($(this).is(":checked")) {
                                   chkVoice = true;
                                    q = {}
                                    q['QueueId'] =  queueId;                            
                                    q['Channel'] = 'VOICE';
                                    queues.push(q);
                               }
                                   
                           }
                           if($(this).attr('name')==='chkChat') {
                               if($(this).prop("checked") === true) {
                                   chkChat = true;
                                    q = {}
                                    q['QueueId'] =  queueId;                            
                                    q['Channel'] = 'CHAT';
                                    queues.push(q);
                               }
                                   
                           }
                       }
                       
                   });
                   if(deleteMe)
                       $(this).remove();
                });        
            }
        try {
            await disassociateRoutingProfileQueues(dlgInstanceId, selectedRPId, queues);    
        } catch(e) {
            console.log(e);
            showResults(e);
        }
    }
}

async function getListRoutingProfiles() {
    try {
        handleWindow(true, '');
        queueList = await listQueues(dlgInstanceId);
        console.log(queueList);
        rpList = await listRoutingProfiles(dlgInstanceId);
        console.log(rpList);
        formatJSON(rpList, '#rpFormatted');
        rpListTable.clear();
        for (var i=0; i< rpList.RoutingProfileSummaryList.length; i++) {
            var value = rpList.RoutingProfileSummaryList[i];
            let rp = await describeRoutingProfile(dlgInstanceId, value.Id);
            console.log(rp);
            let rpq = await listRoutingProfileQueues(dlgInstanceId, value.Id);
            console.log(rpq);
            if (rp && rpq) { 
                rpListTable.row.add([value.Name, rp.RoutingProfile.Description, rpq.RoutingProfileQueueConfigSummaryList.length, getQueueName(rp.RoutingProfile.DefaultOutboundQueueId)]);
            }
        }
        rpListTable.draw();
        handleWindow(false, '');
    } catch(e) {
        console.log(e);        
        handleWindow(false, '');
        showResults(e);
    }
    
}

function getQueueName(queueId) {
    for(var i=0; i < queueList.QueueSummaryList.length; i++) {
        if(queueId === queueList.QueueSummaryList[i].Id) {            
            return queueList.QueueSummaryList[i].Name;
        }
    }
}

async function describeRP() {
    try {
        let rpq = await getDescribeRoutingProfile(selectedRPId);
        formatJSON(rpq, '#rpFormatted');
    } catch(e) {
        
    }
    
}

const createRoutingProfile = (instanceId, name, description, defaultOutboundQueueId, queueConfigs, mediaConcurrencies) => {
    return new Promise((resolve,reject) => {
           var params = {InstanceId : instanceId, Name : name, Description : description, DefaultOutboundQueueId : defaultOutboundQueueId,
                   QueueConfigs : queueConfigs, MediaConcurrencies : mediaConcurrencies};       
           console.log(params);
           connect.createRoutingProfile(params, function (err, res) {        
                if (err) 
                     reject(err);
                 else 
                    resolve(res);
            });
        });
    }

const updateRoutingProfileName = (instanceId, routingProfileId, name, description) => {
    return new Promise((resolve,reject) => {
       var params = {InstanceId : instanceId, RoutingProfileId : routingProfileId, Name : name, Description : description};       
       console.log(params);
       connect.updateRoutingProfileName(params, function (err, res) {        
            if (err) 
                 reject(err);
             else 
                resolve(res);
        });
    });
}

const updateRoutingProfileConcurrency = (instanceId, routingProfileId, mediaConcurrencies) => {
    return new Promise((resolve,reject) => {
       var params = {InstanceId : instanceId, RoutingProfileId : routingProfileId, MediaConcurrencies : mediaConcurrencies};       
       console.log(params);
       connect.updateRoutingProfileConcurrency(params, function (err, res) {        
            if (err) 
                 reject(err);
             else 
                resolve(res);
        });
    });
}


const updateRoutingProfileDefaultOutboundQueue = (instanceId, routingProfileId, defaultOutboundQueueId) => {
    return new Promise((resolve,reject) => {
       var params = {InstanceId : instanceId, RoutingProfileId : routingProfileId, DefaultOutboundQueueId : defaultOutboundQueueId };       
       console.log(params);
       connect.updateRoutingProfileDefaultOutboundQueue(params, function (err, res) {        
            if (err) 
                 reject(err);
             else 
                resolve(res);
        });
    });
}


const associateRoutingProfileQueues = (instanceId, routingProfileId, queueConfigs) => {
    return new Promise((resolve,reject) => {
           var params = {InstanceId : instanceId, RoutingProfileId : routingProfileId, QueueConfigs : queueConfigs};       
           console.log(params);
           connect.associateRoutingProfileQueues(params, function (err, res) {        
                if (err) 
                     reject(err);
                 else 
                    resolve(res);
            });
        });
    }

const updateRoutingProfileQueues = (instanceId, routingProfileId, queueConfigs) => {
    return new Promise((resolve,reject) => {
           var params = {InstanceId : instanceId, RoutingProfileId : routingProfileId, QueueConfigs : queueConfigs};       
           console.log(params);
           connect.updateRoutingProfileQueues(params, function (err, res) {        
                if (err) 
                     reject(err);
                 else 
                    resolve(res);
            });
        });
    }

const disassociateRoutingProfileQueues = (instanceId, routingProfileId, queueReferences) => {
    return new Promise((resolve,reject) => {
           var params = {InstanceId : instanceId, RoutingProfileId : routingProfileId, QueueReferences : queueReferences};       
           console.log(params);
           connect.disassociateRoutingProfileQueues(params, function (err, res) {        
                if (err) 
                     reject(err);
                 else 
                    resolve(res);
            });
        });
    }

const listRoutingProfiles = (instanceId) => {
    return new Promise((resolve,reject) => {
       var params = {InstanceId : instanceId};       
       console.log(params);
       connect.listRoutingProfiles(params, function (err, res) {        
            if (err) 
                 reject(err);
             else 
                resolve(res);
        });
    });
}

async function getDescribeRoutingProfile(routingProfileId) {
    try {
        let resp = await describeRoutingProfile(dlgInstanceId, routingProfileId);
        console.log(resp);
        return resp;
    } catch(e) {
        console.log(e);        
    }
    
}

const describeRoutingProfile = (instanceId, routingProfileId) => {
    return new Promise((resolve,reject) => {
           var params = {InstanceId : instanceId, RoutingProfileId : routingProfileId};       
           console.log(params);
           connect.describeRoutingProfile(params, function (err, res) {        
                if (err) 
                     reject(err);
                 else 
                    resolve(res);
            });
        });
    }

const listRoutingProfileQueues = (instanceId, routingProfileId) => {
    return new Promise((resolve,reject) => {
           var params = {InstanceId : instanceId, RoutingProfileId : routingProfileId};       
           console.log(params);
           connect.listRoutingProfileQueues(params, function (err, res) {        
                if (err) 
                     reject(err);
                 else 
                    resolve(res);
            });
        });
    }

const listQueues = (instanceId) => {
    return new Promise((resolve,reject) => {
           var params = {InstanceId : instanceId};       
           console.log(params);
           connect.listQueues(params, function (err, res) {        
                if (err) 
                     reject(err);
                 else 
                    resolve(res);
            });
        });
    }

function showResults(message){
    $('#resultSpan').text(message);
    $("#resultDialog").dialog("open");
}

function loadConnectAPIs() {
    connect = new AWS.Connect({ region: dlgSourceRegion});
}


function handleWindow(openClose, text) {
    if(openClose == true) {
        $( "#dialog" ).dialog( "open" );
    } else {
        $( "#dialog" ).dialog( "close" );
    }

    if(text.length>1) {
        $('#waitingSpan').text(text);
    } else {
        $('#waitingSpan').text('    Waiting for server to respond');
    }
}

function setAWSConfig(accessKey, secretKey, rgn) {

    AWS.config.update({
        accessKeyId: accessKey, secretAccessKey: secretKey, region: rgn
    });    
    AWS.config.credentials.get(function (err) {
        if (err)
            console.log(err);
        else {
            credentials = AWS.config.credentials;
            getSessionToken();
        }
    });
    
}

function formatJSON(data, element) {
    $(element).html(prettyPrintJson.toHtml(data));
}


function getSessionToken() {
    var sts = new AWS.STS();
    sts.getSessionToken(function (err, data) {
      if (err) console.log("Error getting credentials");
      else {
          secretKey = data.Credentials.SecretAccessKey;
          accessKey = data.Credentials.AccessKeyId;
          sessionId = data.Credentials.SessionToken;
      }
    });
}

function clear_form_elements(ele) {
    $(':input',ele)
      .not(':button, :submit, :reset')
      .val('')
      .prop('checked', false)
      .prop('selected', false);
}

function saveCookie() {
    dlgSourceAccessKey=$("#dlgSourceAccessKey").val();
    dlgSourceSecretKey=$("#dlgSourceSecretKey").val();
    dlgSourceRegion=$("#dlgSourceRegion").val();
    dlgInstanceId = $("#dlgInstanceId").val();
    if(!checkAllMandatoryFields()) {
        setCookie("dlgSourceAccessKey", dlgSourceAccessKey,100);
        setCookie("dlgSourceSecretKey", dlgSourceSecretKey,100 );
        setCookie("dlgSourceRegion", dlgSourceRegion,100);
        setCookie("dlgInstanceId", dlgInstanceId,100);
        $('#spnAWSMessage').text('');
        setAWSConfig(dlgSourceAccessKey, dlgSourceSecretKey, dlgSourceRegion);
        return true;
    }else{
        $('#spnAWSMessage').text('All fields are mandatory and cannot be whitespaces or null');        
        return false;
    }
}

function getCookie(c_name)
{
    var i,x,y,ARRcookies=document.cookie.split(";");
    for (i=0;i<ARRcookies.length;i++)
    {
      x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
      y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
      x=x.replace(/^\s+|\s+$/g,"");
      if (x===c_name)
        {
          return unescape(y);
        }
     }
}

function setCookie(c_name,value,exdays)
{
    var exdate=new Date();
    exdate.setDate(exdate.getDate() + exdays);
    var c_value=escape(value) + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());
    document.cookie=c_name + "=" + c_value;
}

function checkCookie()
{
    dlgSourceAccessKey=getCookie("dlgSourceAccessKey");
    dlgSourceSecretKey=getCookie("dlgSourceSecretKey");
    dlgSourceRegion=getCookie("dlgSourceRegion");
    dlgInstanceId=getCookie("dlgInstanceId");
    $('#dlgSourceAccessKey').val(dlgSourceAccessKey);
    $('#dlgSourceSecretKey').val(dlgSourceSecretKey);
    $('#dlgSourceRegion').val(dlgSourceRegion);
    $('#dlgInstanceId').val(dlgInstanceId);
    
    return checkAllMandatoryFields();
}

function checkAllMandatoryFields() {
    if(isBlank(dlgSourceAccessKey) || dlgSourceAccessKey.isEmpty() || 
            isBlank(dlgSourceSecretKey) || dlgSourceSecretKey.isEmpty() || 
            isBlank(dlgSourceRegion) || dlgSourceRegion.isEmpty() ||
            isBlank(dlgInstanceId) || dlgInstanceId.isEmpty()
            ) {
        return true;
    }else
        return false;
}

function isBlank(str) {
    return (!str || /^\s*$/.test(str));
}

String.prototype.isEmpty = function() {
    return (this.length === 0 || !this.trim());
};