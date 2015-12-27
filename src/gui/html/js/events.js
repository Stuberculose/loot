'use strict';
function onGamePluginsChange(evt) {
  if (!evt.detail.valuesAreTotals) {
    evt.detail.totalMessageNo += parseInt(document.getElementById('totalMessageNo').textContent, 10);
    evt.detail.warnMessageNo += parseInt(document.getElementById('totalWarningNo').textContent, 10);
    evt.detail.errorMessageNo += parseInt(document.getElementById('totalErrorNo').textContent, 10);
    evt.detail.totalPluginNo += parseInt(document.getElementById('totalPluginNo').textContent, 10);
    evt.detail.activePluginNo += parseInt(document.getElementById('activePluginNo').textContent, 10);
    evt.detail.dirtyPluginNo += parseInt(document.getElementById('dirtyPluginNo').textContent, 10);
  }

  document.getElementById('filterTotalMessageNo').textContent = evt.detail.totalMessageNo;
  document.getElementById('totalMessageNo').textContent = evt.detail.totalMessageNo;
  document.getElementById('totalWarningNo').textContent = evt.detail.warnMessageNo;
  document.getElementById('totalErrorNo').textContent = evt.detail.errorMessageNo;

  document.getElementById('filterTotalPluginNo').textContent = evt.detail.totalPluginNo;
  document.getElementById('totalPluginNo').textContent = evt.detail.totalPluginNo;
  document.getElementById('activePluginNo').textContent = evt.detail.activePluginNo;
  document.getElementById('dirtyPluginNo').textContent = evt.detail.dirtyPluginNo;
}
function onGameGlobalMessagesChange(evt) {
  document.getElementById('filterTotalMessageNo').textContent = parseInt(document.getElementById('filterTotalMessageNo').textContent, 10) + evt.detail.totalDiff;
  document.getElementById('totalMessageNo').textContent = parseInt(document.getElementById('totalMessageNo').textContent, 10) + evt.detail.totalDiff;
  document.getElementById('totalWarningNo').textContent = parseInt(document.getElementById('totalWarningNo').textContent, 10) + evt.detail.warningDiff;
  document.getElementById('totalErrorNo').textContent = parseInt(document.getElementById('totalErrorNo').textContent, 10) + evt.detail.errorDiff;

  /* Remove old messages from UI. */
  const generalMessagesList = document.getElementById('summary').getElementsByTagName('ul')[0];
  while (generalMessagesList.firstElementChild) {
    generalMessagesList.removeChild(generalMessagesList.firstElementChild);
  }

  /* Add new messages. */
  if (evt.detail.messages) {
    evt.detail.messages.forEach((message) => {
      const li = document.createElement('li');
      li.className = message.type;
      /* Use the Marked library for Markdown formatting support. */
      li.innerHTML = marked(message.content[0].str);
      generalMessagesList.appendChild(li);
    });
  }
}
function onGameMasterlistChange(evt) {
  document.getElementById('masterlistRevision').textContent = evt.detail.revision;
  document.getElementById('masterlistDate').textContent = evt.detail.date;
}
function onGameFolderChange(evt) {
  updateSelectedGame(evt.detail.folder);
  /* Enable/disable the redate plugins option. */
  let index = undefined;
  if (loot.settings && loot.settings.games) {
    for (let i = 0; i < loot.settings.games.length; ++i) {
      if (loot.settings.games[i].folder === evt.detail.folder) {
        index = i;
        break;
      }
    }
  }
  const redateButton = document.getElementById('redatePluginsButton');
  if (index && loot.settings.games[index].type === 'Skyrim') {
    redateButton.removeAttribute('disabled');
  } else {
    redateButton.setAttribute('disabled', true);
  }
}
function onPluginMessageChange(evt) {
  document.getElementById('filterTotalMessageNo').textContent = parseInt(document.getElementById('filterTotalMessageNo').textContent, 10) + evt.detail.totalDiff;
  document.getElementById('totalMessageNo').textContent = parseInt(document.getElementById('totalMessageNo').textContent, 10) + evt.detail.totalDiff;
  document.getElementById('totalWarningNo').textContent = parseInt(document.getElementById('totalWarningNo').textContent, 10) + evt.detail.warningDiff;
  document.getElementById('totalErrorNo').textContent = parseInt(document.getElementById('totalErrorNo').textContent, 10) + evt.detail.errorDiff;
}
function onPluginIsDirtyChange(evt) {
  if (evt.detail.isDirty) {
    document.getElementById('dirtyPluginNo').textContent = parseInt(document.getElementById('dirtyPluginNo').textContent, 10) + 1;
  } else {
    document.getElementById('dirtyPluginNo').textContent = parseInt(document.getElementById('dirtyPluginNo').textContent, 10) - 1;
  }
}
function saveFilterState(evt) {
  loot.query('saveFilterState', evt.target.id, evt.target.checked).catch(handlePromiseError);
}
function onToggleDisplayCSS(evt) {
  const attr = 'data-hide-' + evt.target.getAttribute('data-class');
  if (evt.target.checked) {
    document.getElementById('main').setAttribute(attr, true);
  } else {
    document.getElementById('main').removeAttribute(attr);
  }

  if (evt.target.id !== 'hideBashTags') {
    /* Now perform search again. If there is no current search, this won't
       do anything. */
    document.getElementById('searchBar').search();
  }
}
function onToggleBashTags(evt) {
  onToggleDisplayCSS(evt);
  document.getElementById('main').lastElementChild.updateSize();
  /* Now perform search again. If there is no current search, this won't
     do anything. */
  document.getElementById('searchBar').search();
}
function onOpenLogLocation(evt) {
  loot.query('openLogLocation').catch(handlePromiseError);
}
function onChangeGame(evt) {
  /* Check that the selected game isn't the current one. */
  if (evt.target.className.indexOf('core-selected') !== -1) {
    return;
  }

  /* Send off a CEF query with the folder name of the new game. */
  loot.Dialog.showProgress(loot.l10n.translate('Loading game data...'));
  loot.query('changeGame', evt.currentTarget.getAttribute('value')).then((result) => {
    /* Filters should be re-applied on game change, except the conflicts
       filter. Don't need to deactivate the others beforehand. Strictly not
       deactivating the conflicts filter either, just resetting it's value.
       */
    document.body.removeAttribute('data-conflicts');

    /* Clear the UI of all existing game-specific data. Also
       clear the card and li variables for each plugin object. */
    const globalMessages = document.getElementById('summary').getElementsByTagName('ul')[0];
    while (globalMessages.firstElementChild) {
      globalMessages.removeChild(globalMessages.firstElementChild);
    }

    /* Parse the data sent from C++. */
    const gameInfo = JSON.parse(result, loot.Plugin.fromJson);
    loot.game.folder = gameInfo.folder;
    loot.game.masterlist = gameInfo.masterlist;
    loot.game.globalMessages = gameInfo.globalMessages;
    loot.game.plugins = gameInfo.plugins;

    /* Reset virtual list positions. */
    document.getElementById('cardsNav').scrollToItem(0);
    document.getElementById('main').lastElementChild.scrollToItem(0);

    /* Now update virtual lists. */
    setFilteredUIData();

    loot.Dialog.closeProgress();
  }).catch(handlePromiseError);
}
function onOpenReadme(evt) {
  loot.query('openReadme').catch(handlePromiseError);
}
/* Masterlist update process, minus progress dialog. */
function updateMasterlistNoProgress() {
  return loot.query('updateMasterlist').then(JSON.parse).then((result) => {
    if (result) {
      /* Update JS variables. */
      loot.game.masterlist = result.masterlist;
      loot.game.globalMessages = result.globalMessages;

      result.plugins.forEach((plugin) => {
        for (let i = 0; i < loot.game.plugins.length; ++i) {
          if (loot.game.plugins[i].name === plugin.name) {
            loot.game.plugins[i].isDirty = plugin.isDirty;
            loot.game.plugins[i].isPriorityGlobal = plugin.isPriorityGlobal;
            loot.game.plugins[i].masterlist = plugin.masterlist;
            loot.game.plugins[i].messages = plugin.messages;
            loot.game.plugins[i].priority = plugin.priority;
            loot.game.plugins[i].tags = plugin.tags;
            break;
          }
        }
      });
      /* Hack to stop cards overlapping. */
      document.getElementById('main').lastElementChild.updateSize();

      loot.Dialog.showNotification(loot.l10n.translate('Masterlist updated to revision %s.', loot.game.masterlist.revision));
    } else {
      loot.Dialog.showNotification(loot.l10n.translate('No masterlist update was necessary.'));
    }
  }).catch(handlePromiseError);
}
function onUpdateMasterlist() {
  loot.Dialog.showProgress(loot.l10n.translate('Updating masterlist...'));
  updateMasterlistNoProgress().then(() => {
    loot.Dialog.closeProgress();
  }).catch(handlePromiseError);
}
function onSortPlugins() {
  if (document.body.hasAttribute('data-conflicts')) {
    /* Deactivate any existing plugin conflict filter. */
    for (let i = 0; i < loot.game.plugins.length; ++i) {
      loot.game.plugins[i].isConflictFilterChecked = false;
    }
    /* Un-highlight any existing filter plugin. */
    const cards = document.getElementById('main').getElementsByTagName('loot-plugin-card');
    for (let i = 0; i < cards.length; ++i) {
      cards[i].classList.toggle('highlight', false);
    }
    document.body.removeAttribute('data-conflicts');
  }

  let promise = Promise.resolve('');
  if (loot.settings.updateMasterlist) {
    promise = promise.then(updateMasterlistNoProgress());
  }
  promise.then(() => {
    loot.Dialog.showProgress(loot.l10n.translate('Sorting plugins...'));
    return loot.query('sortPlugins').then(JSON.parse);
  }).then((result) => {
    if (!result) {
      return;
    }
    loot.game.oldLoadOrder = loot.game.plugins;
    loot.game.loadOrder = [];
    result.forEach((plugin) => {
      let found = false;
      for (let i = 0; i < loot.game.plugins.length; ++i) {
        if (loot.game.plugins[i].name === plugin.name) {
          loot.game.plugins[i].crc = plugin.crc;
          loot.game.plugins[i].isEmpty = plugin.isEmpty;

          loot.game.plugins[i].messages = plugin.messages;
          loot.game.plugins[i].tags = plugin.tags;
          loot.game.plugins[i].isDirty = plugin.isDirty;

          loot.game.loadOrder.push(loot.game.plugins[i]);

          found = true;
          break;
        }
      }
      if (!found) {
        loot.game.plugins.push(new loot.Plugin(plugin));
        loot.game.loadOrder.push(loot.game.plugins[loot.game.plugins.length - 1]);
      }
    });

    /* Now update the UI for the new order. */
    loot.game.plugins = loot.game.loadOrder;
    setFilteredUIData();

    /* Now hide the masterlist update buttons, and display the accept and
       cancel sort buttons. */
    hideElement(document.getElementById('updateMasterlistButton'));
    hideElement(document.getElementById('sortButton'));
    showElement(document.getElementById('applySortButton'));
    showElement(document.getElementById('cancelSortButton'));

    /* Disable changing game. */
    document.getElementById('gameMenu').setAttribute('disabled', '');
    loot.Dialog.closeProgress();
  }).catch(handlePromiseError);
}
function onApplySort() {
  const loadOrder = [];
  loot.game.plugins.forEach((plugin) => {
    loadOrder.push(plugin.name);
  });
  return loot.query('applySort', loadOrder).then((result) => {
    /* Remove old load order storage. */
    delete loot.game.loadOrder;
    delete loot.game.oldLoadOrder;

    /* Now show the masterlist update buttons, and hide the accept and
       cancel sort buttons. */
    showElement(document.getElementById('updateMasterlistButton'));
    showElement(document.getElementById('sortButton'));
    hideElement(document.getElementById('applySortButton'));
    hideElement(document.getElementById('cancelSortButton'));

    /* Enable changing game. */
    document.getElementById('gameMenu').removeAttribute('disabled');
  }).catch(handlePromiseError);
}
function onCancelSort(evt) {
  return loot.query('cancelSort').then(() => {
    /* Sort UI elements again according to stored old load order. */
    loot.game.plugins = loot.game.oldLoadOrder;
    setFilteredUIData();
    delete loot.game.loadOrder;
    delete loot.game.oldLoadOrder;

    /* Now show the masterlist update buttons, and hide the accept and
       cancel sort buttons. */
    showElement(document.getElementById('updateMasterlistButton'));
    showElement(document.getElementById('sortButton'));
    hideElement(document.getElementById('applySortButton'));
    hideElement(document.getElementById('cancelSortButton'));

    /* Enable changing game. */
    document.getElementById('gameMenu').removeAttribute('disabled');
  }).catch(handlePromiseError);
}
function onRedatePlugins(evt) {
  if (evt.target.hasAttribute('disabled')) {
    return;
  }

  loot.Dialog.askQuestion(loot.l10n.translate('Redate Plugins?'), loot.l10n.translate('This feature is provided so that modders using the Creation Kit may set the load order it uses. A side-effect is that any subscribed Steam Workshop mods will be re-downloaded by Steam. Do you wish to continue?'), loot.l10n.translate('Redate'), (result) => {
    if (result) {
      loot.query('redatePlugins').then(() => {
        loot.Dialog.showNotification('Plugins were successfully redated.');
      }).catch(handlePromiseError);
    }
  });
}
function onClearAllMetadata() {
  loot.Dialog.askQuestion('', loot.l10n.translate('Are you sure you want to clear all existing user-added metadata from all plugins?'), loot.l10n.translate('Clear'), (result) => {
    if (!result) {
      return;
    }
    loot.query('clearAllMetadata').then(JSON.parse).then((plugins) => {
      if (!plugins) {
        return;
      }
      /* Need to empty the UI-side user metadata. */
      plugins.forEach((plugin) => {
        for (let i = 0; i < loot.game.plugins.length; ++i) {
          if (loot.game.plugins[i].name === plugin.name) {
            loot.game.plugins[i].userlist = undefined;
            loot.game.plugins[i].editor = undefined;

            loot.game.plugins[i].priority = plugin.priority;
            loot.game.plugins[i].isPriorityGlobal = plugin.isPriorityGlobal;
            loot.game.plugins[i].messages = plugin.messages;
            loot.game.plugins[i].tags = plugin.tags;
            loot.game.plugins[i].isDirty = plugin.isDirty;

            break;
          }
        }
      });

      loot.Dialog.showNotification(loot.l10n.translate('All user-added metadata has been cleared.'));
    }).catch(handlePromiseError);
  });
}
function onCopyContent() {
  const messages = [];
  const plugins = [];

  if (loot.game) {
    if (loot.game.globalMessages) {
      loot.game.globalMessages.forEach((message) => {
        messages.push({
          type: message.type,
          content: message.content[0].str,
        });
      });
    }
    if (loot.game.plugins) {
      loot.game.plugins.forEach((plugin) => {
        plugins.push({
          name: plugin.name,
          crc: plugin.crc,
          version: plugin.version,
          isActive: plugin.isActive,
          isEmpty: plugin.isEmpty,
          loadsArchive: plugin.loadsArchive,

          priority: plugin.priority,
          isPriorityGlobal: plugin.isPriorityGlobal,
          messages: plugin.messages,
          tags: plugin.tags,
          isDirty: plugin.isDirty,
        });
      });
    }
  } else {
    const message = document.getElementById('summary').getElementsByTagName('ul')[0].firstElementChild;
    if (message) {
      messages.push({
        type: 'error',
        content: message.textContent,
      });
    }
  }

  loot.query('copyContent', {
    messages: messages,
    plugins: plugins,
  }).then(() => {
    loot.Dialog.showNotification(loot.l10n.translate("LOOT's content has been copied to the clipboard."));
  }).catch(handlePromiseError);
}
function onCopyLoadOrder() {
  const plugins = [];

  if (loot.game) {
    if (loot.game.plugins) {
      loot.game.plugins.forEach((plugin) =>{
        plugins.push(plugin.name);
      });
    }
  }

  loot.query('copyLoadOrder', plugins).then(() => {
    loot.Dialog.showNotification(loot.l10n.translate('The load order has been copied to the clipboard.'));
  }).catch(handlePromiseError);
}
function onSwitchSidebarTab(evt) {
  if (evt.detail.isSelected) {
    document.getElementById(evt.target.selected).parentElement.selected = evt.target.selected;
  }
}
function onShowAboutDialog() {
  document.getElementById('about').showModal();
}
function areSettingsValid() {
  /* Validate inputs individually. */
  const inputs = document.getElementById('settingsDialog').getElementsByTagName('loot-validated-input');
  for (let i = 0; i < inputs.length; ++i) {
    if (!inputs[i].checkValidity()) {
      return false;
    }
  }
  return true;
}
function onCloseSettingsDialog(evt) {
  if (evt.target.classList.contains('accept')) {
    if (!areSettingsValid()) {
      return;
    }

    /* Update the JS variable values. */
    const settings = {
      enableDebugLogging: document.getElementById('enableDebugLogging').checked,
      game: document.getElementById('defaultGameSelect').value,
      games: document.getElementById('gameTable').getRowsData(false),
      language: document.getElementById('languageSelect').value,
      lastGame: loot.settings.lastGame,
      updateMasterlist: document.getElementById('updateMasterlist').checked,
      filters: loot.settings.filters,
    };

    /* Send the settings back to the C++ side. */
    loot.query('closeSettings', settings).then(JSON.parse).then((result) => {
      setInstalledGames(result);
    }).catch(handlePromiseError).then(() => {
      loot.settings = settings;
      updateSettingsUI();
    }).catch(handlePromiseError);
  } else {
    /* Re-apply the existing settings to the settings dialog elements. */
    updateSettingsUI();
  }
  evt.target.parentElement.close();
}
function onShowSettingsDialog() {
  document.getElementById('settingsDialog').showModal();
}
function onFocusSearch(evt) {
  if (evt.ctrlKey && evt.keyCode === 70) { // 'f'
    document.getElementById('mainToolbar').classList.add('search');
    document.getElementById('searchBar').focusInput();
  }
}
function onEditorOpen(evt) {
  /* Set up drag 'n' drop event handlers. */
  const elements = document.getElementById('cardsNav').getElementsByTagName('loot-plugin-item');
  for (let i = 0; i < elements.length; ++i) {
    elements[i].draggable = true;
    elements[i].addEventListener('dragstart', elements[i].onDragStart);
  }

  /* Now show editor. */
  evt.target.classList.toggle('flip');

  /* Enable priority hover in plugins list and enable header
     buttons if this is the only editor instance. */
  let numEditors = 0;
  if (document.body.hasAttribute('data-editors')) {
    numEditors = parseInt(document.body.getAttribute('data-editors'), 10);
  }
  ++numEditors;

  if (numEditors === 1) {
    /* Set the edit mode toggle attribute. */
    document.getElementById('cardsNav').setAttribute('data-editModeToggle', '');
    /* Disable the toolbar elements. */
    document.getElementById('wipeUserlistButton').setAttribute('disabled', '');
    document.getElementById('copyContentButton').setAttribute('disabled', '');
    document.getElementById('refreshContentButton').setAttribute('disabled', '');
    document.getElementById('settingsButton').setAttribute('disabled', '');
    document.getElementById('gameMenu').setAttribute('disabled', '');
    document.getElementById('updateMasterlistButton').setAttribute('disabled', '');
    document.getElementById('sortButton').setAttribute('disabled', '');
  }
  document.body.setAttribute('data-editors', numEditors);
  document.getElementById('cardsNav').updateSize();

  return loot.query('editorOpened').catch(handlePromiseError);
}
function onEditorClose(evt) {
  /* evt.detail is true if the apply button was pressed. */
  let promise;
  if (evt.detail) {
    /* Need to record the editor control values and work out what's
       changed, and update any UI elements necessary. Offload the
       majority of the work to the C++ side of things. */
    const edits = evt.target.readFromEditor(evt.target.data);
    promise = loot.query('editorClosed', edits).then(JSON.parse).then((result) => {
      if (result) {
        evt.target.data.priority = result.priority;
        evt.target.data.isPriorityGlobal = result.isPriorityGlobal;
        evt.target.data.messages = result.messages;
        evt.target.data.tags = result.tags;
        evt.target.data.isDirty = result.isDirty;

        evt.target.data.userlist = edits.userlist;

        /* Now perform search again. If there is no current search, this won't
           do anything. */
        document.getElementById('searchBar').search();
      }
    });
  } else {
    /* Don't need to record changes, but still need to notify C++ side that
       the editor has been closed. */
    promise = loot.query('editorClosed');
  }
  promise.then(() => {
    delete evt.target.data.editor;

    /* Now hide editor. */
    evt.target.classList.toggle('flip');
    evt.target.data.isEditorOpen = false;

    /* Remove drag 'n' drop event handlers. */
    const elements = document.getElementById('cardsNav').getElementsByTagName('loot-plugin-item');
    for (let i = 0; i < elements.length; ++i) {
      elements[i].removeAttribute('draggable');
      elements[i].removeEventListener('dragstart', elements[i].onDragStart);
    }

    /* Disable priority hover in plugins list and enable header
       buttons if this is the only editor instance. */
    let numEditors = parseInt(document.body.getAttribute('data-editors'), 10);
    --numEditors;

    if (numEditors === 0) {
      document.body.removeAttribute('data-editors');
      /* Set the edit mode toggle attribute. */
      document.getElementById('cardsNav').setAttribute('data-editModeToggle', '');
      /* Re-enable toolbar elements. */
      document.getElementById('wipeUserlistButton').removeAttribute('disabled');
      document.getElementById('copyContentButton').removeAttribute('disabled');
      document.getElementById('refreshContentButton').removeAttribute('disabled');
      document.getElementById('settingsButton').removeAttribute('disabled');
      document.getElementById('gameMenu').removeAttribute('disabled');
      document.getElementById('updateMasterlistButton').removeAttribute('disabled');
      document.getElementById('sortButton').removeAttribute('disabled');
    } else {
      document.body.setAttribute('data-editors', numEditors);
    }
    document.getElementById('cardsNav').updateSize();
  }).catch(handlePromiseError);
}
function onConflictsFilter(evt) {
  /* Deactivate any existing plugin conflict filter. */
  for (let i = 0; i < loot.game.plugins.length; ++i) {
    if (loot.game.plugins[i].id !== evt.target.id) {
      loot.game.plugins[i].isConflictFilterChecked = false;
    }
  }
  /* Un-highlight any existing filter plugin. */
  const cards = document.getElementById('main').getElementsByTagName('loot-plugin-card');
  for (let i = 0; i < cards.length; ++i) {
    cards[i].classList.toggle('highlight', false);
  }
  /* evt.detail is true if the filter has been activated. */
  if (evt.detail) {
    document.body.setAttribute('data-conflicts', evt.target.getName());
    evt.target.classList.toggle('highlight', true);
  } else {
    document.body.removeAttribute('data-conflicts');
  }
  setFilteredUIData();
}
function onCopyMetadata(evt) {
  loot.query('copyMetadata', evt.target.getName()).then(() => {
    loot.Dialog.showNotification(loot.l10n.translate('The metadata for "%s" has been copied to the clipboard.', evt.target.getName()));
  }).catch(handlePromiseError);
}
function onClearMetadata(evt) {
  loot.Dialog.askQuestion('', loot.l10n.translate('Are you sure you want to clear all existing user-added metadata from "%s"?', evt.target.getName()), loot.l10n.translate('Clear'), (result) => {
    if (!result) {
      return;
    }
    loot.query('clearPluginMetadata', evt.target.getName()).then(JSON.parse).then((plugin) => {
      if (!result) {
        return;
      }
      /* Need to empty the UI-side user metadata. */
      for (let i = 0; i < loot.game.plugins.length; ++i) {
        if (loot.game.plugins[i].id === evt.target.id) {
          loot.game.plugins[i].userlist = undefined;
          loot.game.plugins[i].editor = undefined;

          loot.game.plugins[i].priority = plugin.priority;
          loot.game.plugins[i].isPriorityGlobal = plugin.isPriorityGlobal;
          loot.game.plugins[i].messages = plugin.messages;
          loot.game.plugins[i].tags = plugin.tags;
          loot.game.plugins[i].isDirty = plugin.isDirty;

          break;
        }
      }
      loot.Dialog.showNotification(loot.l10n.translate('The user-added metadata for "%s" has been cleared.', evt.target.getName()));
      /* Now perform search again. If there is no current search, this won't
         do anything. */
      document.getElementById('searchBar').search();
    }).catch(handlePromiseError);
  });
}
function onSidebarClick(evt) {
  if (evt.target.hasAttribute('data-index')) {
    document.getElementById('main').lastElementChild.scrollToItem(evt.target.getAttribute('data-index'));

    if (evt.type === 'dblclick') {
      const card = document.getElementById(evt.target.getAttribute('data-id'));
      if (!card.classList.contains('flip')) {
        document.getElementById(evt.target.getAttribute('data-id')).onShowEditor();
      }
    }
  }
}
function handleUnappliedChangesClose(change) {
  loot.Dialog.askQuestion('', loot.l10n.translate('You have not yet applied or cancelled your %s. Are you sure you want to quit?', change), loot.l10n.translate('Quit'), (result) => {
    if (!result) {
      return;
    }
    /* Cancel any sorting and close any editors. Cheat by sending a
       cancelSort query for as many times as necessary. */
    const queries = [];
    let numQueries = 0;
    if (!document.getElementById('applySortButton').classList.contains('hidden')) {
      numQueries += 1;
    }
    numQueries += document.body.getAttribute('data-editors');
    for (let i = 0; i < numQueries; ++i) {
      queries.push(loot.query('cancelSort'));
    }
    Promise.all(queries).then(() => {
      window.close();
    }).catch(handlePromiseError);
  });
}
function onQuit(evt) {
  if (!document.getElementById('applySortButton').classList.contains('hidden')) {
    handleUnappliedChangesClose(loot.l10n.translate('sorted load order'));
  } else if (document.body.hasAttribute('data-editors')) {
    handleUnappliedChangesClose(loot.l10n.translate('metadata edits'));
  } else {
    window.close();
  }
}
function onJumpToGeneralInfo() {
  window.location.hash = '';
  document.getElementById('main').scrollTop = 0;
}
function onContentRefresh() {
  /* Send a query for updated load order and plugin header info. */
  loot.Dialog.showProgress(loot.l10n.translate('Refreshing data...'));
  loot.query('getGameData').then(JSON.parse).then((result) => {
    /* Parse the data sent from C++. */
    /* We don't want the plugin info creating cards, so don't convert
       to plugin objects. */
    const gameInfo = result;

    /* Now overwrite plugin data with the newly sent data. Also update
       card and li vars as they were unset when the game was switched
       from before. */
    const pluginNames = [];
    gameInfo.plugins.forEach((plugin) => {
      let foundPlugin = false;
      for (let i = 0; i < loot.game.plugins.length; ++i) {
        if (loot.game.plugins[i].name === plugin.name) {
          loot.game.plugins[i].isActive = plugin.isActive;
          loot.game.plugins[i].isEmpty = plugin.isEmpty;
          loot.game.plugins[i].loadsArchive = plugin.loadsArchive;
          loot.game.plugins[i].crc = plugin.crc;
          loot.game.plugins[i].version = plugin.version;

          loot.game.plugins[i].priority = plugin.priority;
          loot.game.plugins[i].isPriorityGlobal = plugin.isPriorityGlobal;
          loot.game.plugins[i].messages = plugin.messages;
          loot.game.plugins[i].tags = plugin.tags;
          loot.game.plugins[i].isDirty = plugin.isDirty;

          foundPlugin = true;
          break;
        }
      }
      if (!foundPlugin) {
        /* A new plugin. */
        loot.game.plugins.push(new loot.Plugin(plugin));
      }
      pluginNames.push(plugin.name);
    });
    for (let i = 0; i < loot.game.plugins.length;) {
      let foundPlugin = false;
      for (let j = 0; j < pluginNames.length; ++j) {
        if (loot.game.plugins[i].name === pluginNames[j]) {
          foundPlugin = true;
          break;
        }
      }
      if (!foundPlugin) {
        /* Remove plugin. */
        loot.game.plugins.splice(i, 1);
      } else {
        ++i;
      }
    }

    /* Reapply filters. */
    setFilteredUIData();

    loot.Dialog.closeProgress();
  }).catch(handlePromiseError);
}
function onSearchOpen() {
  document.getElementById('mainToolbar').classList.add('search');
  document.getElementById('searchBar').focusInput();
}
function onSearchClose() {
  document.getElementById('mainToolbar').classList.remove('search');
}
function onSidebarFilterToggle(evt) {
  if (evt.target.id !== 'contentFilter') {
    loot.filters[evt.target.id] = evt.target.checked;
  } else {
    loot.filters.contentSearchString = evt.target.value;
  }
  saveFilterState(evt);
  setFilteredUIData();
}
function setupEventHandlers() {
  /* Set up handlers for filters. */
  document.getElementById('hideVersionNumbers').addEventListener('change', onToggleDisplayCSS);
  document.getElementById('hideVersionNumbers').addEventListener('change', saveFilterState);
  document.getElementById('hideCRCs').addEventListener('change', onToggleDisplayCSS);
  document.getElementById('hideCRCs').addEventListener('change', saveFilterState);
  document.getElementById('hideBashTags').addEventListener('change', onToggleBashTags);
  document.getElementById('hideBashTags').addEventListener('change', saveFilterState);
  document.getElementById('hideNotes').addEventListener('change', onSidebarFilterToggle);
  document.getElementById('hideDoNotCleanMessages').addEventListener('change', onSidebarFilterToggle);
  document.getElementById('hideInactivePlugins').addEventListener('change', onSidebarFilterToggle);
  document.getElementById('hideAllPluginMessages').addEventListener('change', onSidebarFilterToggle);
  document.getElementById('hideMessagelessPlugins').addEventListener('change', onSidebarFilterToggle);
  document.body.addEventListener('loot-filter-conflicts', onConflictsFilter);

  /* Set up event handlers for content filter. */
  document.getElementById('contentFilter').addEventListener('change', onSidebarFilterToggle);

  /* Set up handlers for buttons. */
  document.getElementById('redatePluginsButton').addEventListener('click', onRedatePlugins);
  document.getElementById('openLogButton').addEventListener('click', onOpenLogLocation);
  document.getElementById('wipeUserlistButton').addEventListener('click', onClearAllMetadata);
  document.getElementById('copyLoadOrderButton').addEventListener('click', onCopyLoadOrder);
  document.getElementById('copyContentButton').addEventListener('click', onCopyContent);
  document.getElementById('refreshContentButton').addEventListener('click', onContentRefresh);
  document.getElementById('settingsButton').addEventListener('click', onShowSettingsDialog);
  document.getElementById('helpButton').addEventListener('click', onOpenReadme);
  document.getElementById('aboutButton').addEventListener('click', onShowAboutDialog);
  document.getElementById('quitButton').addEventListener('click', onQuit);
  document.getElementById('updateMasterlistButton').addEventListener('click', onUpdateMasterlist);
  document.getElementById('sortButton').addEventListener('click', onSortPlugins);
  document.getElementById('applySortButton').addEventListener('click', onApplySort);
  document.getElementById('cancelSortButton').addEventListener('click', onCancelSort);
  document.getElementById('sidebarTabs').addEventListener('core-select', onSwitchSidebarTab);
  document.getElementById('jumpToGeneralInfo').addEventListener('click', onJumpToGeneralInfo);

  /* Set up search event handlers. */
  document.getElementById('showSearch').addEventListener('click', onSearchOpen);
  document.getElementById('searchBar').addEventListener('loot-search-close', onSearchClose);
  window.addEventListener('keyup', onFocusSearch);

  /* Set up event handlers for settings dialog. */
  const settings = document.getElementById('settingsDialog');
  settings.getElementsByClassName('accept')[0].addEventListener('click', onCloseSettingsDialog);
  settings.getElementsByClassName('cancel')[0].addEventListener('click', onCloseSettingsDialog);

  /* Set up handler for opening and closing editors. */
  document.body.addEventListener('loot-editor-open', onEditorOpen);
  document.body.addEventListener('loot-editor-close', onEditorClose);
  document.body.addEventListener('loot-copy-metadata', onCopyMetadata);
  document.body.addEventListener('loot-clear-metadata', onClearMetadata);

  document.getElementById('cardsNav').addEventListener('click', onSidebarClick);
  document.getElementById('cardsNav').addEventListener('dblclick', onSidebarClick);

  /* Set up handler for plugin message and dirty info changes. */
  document.addEventListener('loot-plugin-message-change', onPluginMessageChange);
  document.addEventListener('loot-plugin-isdirty-change', onPluginIsDirtyChange);

  /* Set up event handlers for game member variable changes. */
  document.addEventListener('loot-game-folder-change', onGameFolderChange);
  document.addEventListener('loot-game-masterlist-change', onGameMasterlistChange);
  document.addEventListener('loot-game-global-messages-change', onGameGlobalMessagesChange);
  document.addEventListener('loot-game-plugins-change', onGamePluginsChange);
}
