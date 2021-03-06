/*  LOOT

A load order optimisation tool for Oblivion, Skyrim, Fallout 3 and
Fallout: New Vegas.

    Copyright (C) 2012-2018    WrinklyNinja

    This file is part of LOOT.

    LOOT is free software : you can redistribute
    it and / or modify it under the terms of the GNU General Public License
    as published by the Free Software Foundation, either version 3 of
    the License, or (at your option) any later version.

    LOOT is distributed in the hope that it will
    be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with LOOT.If not, see
    <https://www.gnu.org/licenses/>.
*/

#include "loot_paths.h"

#include <locale>

#include <boost/locale.hpp>

#include "gui/helpers.h"
#include "gui/state/logging.h"
#include "loot/api.h"

#ifdef _WIN32
#ifndef UNICODE
#define UNICODE
#endif
#ifndef _UNICODE
#define _UNICODE
#endif
#include "shlobj.h"
#include "windows.h"
#endif

namespace loot {
boost::filesystem::path getExecutableDirectory() {
  std::string executablePathString;
#ifdef _WIN32
  // Despite its name, paths can be longer than MAX_PATH, just not by default.
  // FIXME: Make this work with long paths.
  std::wstring wstr(MAX_PATH, 0);

  if (GetModuleFileName(NULL, &wstr[0], MAX_PATH) == 0) {
    auto logger = getLogger();
    if (logger) {
      logger->error("Failed to get LOOT executable path.");
    }
    throw std::system_error(GetLastError(),
      std::system_category(),
      "Failed to get LOOT executable path.");
  }

  executablePathString = FromWinWide(wstr.c_str());
#else
  char result[PATH_MAX];

  ssize_t count = readlink("/proc/self/exe", result, PATH_MAX);
  if (count < 0) {
    auto logger = getLogger();
    if (logger) {
      logger->error("Failed to get LOOT executable path.");
    }
    throw std::system_error(count,
      std::system_category(),
      "Failed to get LOOT executable path.");
  }

  executablePathString = std::string(result, count);
#endif

  return boost::filesystem::path(executablePathString).parent_path();
}

boost::filesystem::path LootPaths::getReadmePath() {
  return lootAppPath_ / "docs";
}

boost::filesystem::path LootPaths::getResourcesPath() {
  return lootAppPath_ / "resources";
}

boost::filesystem::path LootPaths::getL10nPath() {
  return getResourcesPath() / "l10n";
}

boost::filesystem::path LootPaths::getLootDataPath() { return lootDataPath_; }

boost::filesystem::path LootPaths::getSettingsPath() {
  return lootDataPath_ / "settings.toml";
}

boost::filesystem::path LootPaths::getLogPath() {
  return lootDataPath_ / "LOOTDebugLog.txt";
}

void LootPaths::initialise(const std::string& lootDataPath) {
  // Set the locale to get UTF-8 conversions working correctly.
  std::locale::global(boost::locale::generator().generate(""));
  boost::filesystem::path::imbue(std::locale());
  loot::InitialiseLocale("");

  lootAppPath_ = getExecutableDirectory();

  if (!lootDataPath.empty())
    lootDataPath_ = lootDataPath;
  else
    lootDataPath_ = getLocalAppDataPath() / "LOOT";
}

boost::filesystem::path LootPaths::getLocalAppDataPath() {
#ifdef _WIN32
  HWND owner = 0;
  PWSTR path;

  if (SHGetKnownFolderPath(FOLDERID_LocalAppData, 0, NULL, &path) != S_OK)
    throw std::system_error(GetLastError(),
                            std::system_category(),
                            "Failed to get %LOCALAPPDATA% path.");

  boost::filesystem::path localAppDataPath(FromWinWide(path));
  CoTaskMemFree(path);

  return localAppDataPath;
#else
  // Use XDG_CONFIG_HOME environmental variable if it's available.
  const char* xdgConfigHome = getenv("XDG_CONFIG_HOME");

  if (xdgConfigHome != nullptr)
    return boost::filesystem::path(xdgConfigHome);

  // Otherwise, use the HOME env. var. if it's available.
  xdgConfigHome = getenv("HOME");

  if (xdgConfigHome != nullptr)
    return boost::filesystem::path(xdgConfigHome) / ".config";

  // If somehow both are missing, use the executable's directory.
  return getExecutableDirectory();
#endif
}

boost::filesystem::path LootPaths::lootAppPath_;
boost::filesystem::path LootPaths::lootDataPath_;
}
