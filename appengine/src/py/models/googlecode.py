#!/usr/bin/env python
#
# Copyright 2010 The Rhizosphere Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

#
# The model classes contained here describe Issues extracted from the
# Google Code Hosting issue tracker and associated statistics. They
# are used to populate a Rhizosphere showcase app.
#

import datetime
from django.utils import simplejson


# The schema that collects all the Google Code-specific extensions in
# Atom feed that contains extracted issues from the Google Code Hosting
# project tracker.
SCHEMA = 'http://schemas.google.com/projecthosting/issues/2009'


# The conventional owner name used when an issue is not yet assigned to any
# owner.
UNASSIGNED_OWNER = '- Unassigned'


# The conventional reporter name used when an issue has been reported by an
# unknown user.
UNKNOWN_REPORTER = '- Unknown'


def SanitizeJsKey(text):
  """Ensures a text string will parse as a correct Javascript variable."""
  return '__%s' % text.replace('.','_')


class Issue(object):
  """Describes an Issue extracted from the Google Code Hosting tracker.

  TODO(battlehorse): currently missing information about people CC-ed to the
  issue and merge issues for duplicate ones.
  """

  def __init__(self, entry, url_base='http://code.google.com'):
    """Creates a new instance.

    Args:
      entry: the Atom entry, extracted from a GData feed, that describes the
          issue.
      url_base: str that contains the base URL to turn relative urls into
          absolute ones.
    """
    self.url_base = url_base

    # The unique Atom Id for this entry.
    self.atom_id = entry.id.text

    # The issue id, unique within the Google Code project the issue belongs to.
    self.issue_id = None

    # The link to the html page that describes this issue.
    self.html_link = entry.GetHtmlLink().href

    # The link to the atom element that describes the issue itself.
    self.self_link = entry.GetSelfLink().href

    # The person that reported the issue.
    assert hasattr(entry, 'author')
    assert len(entry.author) > 0
    self.reporter = Person(entry.author[0].name, entry.author[0].uri, url_base)

    # The content of the issue.
    assert hasattr(entry, 'content')
    self.content = Content(entry.content)

    # The issue summary (as extracted from an atom.data.Title type
    self.summary = entry.title.text

    # The issue publishing (creation) and last update dates.
    assert hasattr(entry, 'updated')
    assert hasattr(entry, 'published')
    self.updated = Date(entry.updated)
    self.created = Date(entry.published)

    # The issue close date (if the issue has been closed).
    self.closed_date = None

    # The issue state. Either 'open' or 'closed'
    self.state = 'open'

    # The issue current status.
    self.status = 'Unknown Status'

    # The number of people that starred the issue.
    self.stars = 0

    # The issue owner, if already assigned.
    self.owner = None

    # The set of issue lables.
    self.labels = Labels()

    # The list of issue ids this issue is blocked on.
    self.blockedon_ids = []

    # Parse the list of atom.ExtensionElement matching the Google Code Hosting
    # schema, to extract all custom issue attributes.
    known_extensions = {
      'closedDate' : self._ParseClosedDate,
      'state': self._ParseState,
      'status': self._ParseStatus,
      'stars': self._ParseStars,
      'owner': self._ParseOwner,
      'label': self._ParseLabel,
      'id': self._ParseId,
      'blockedOn': self._ParseBlockedOn,
    }

    for extension in entry.FindExtensions(namespace=SCHEMA):
      tag = extension.tag
      if tag in known_extensions:
        known_extensions[tag](extension)

    # The id extension should always be present
    assert self.issue_id is not None

  def _ParseClosedDate(self, extension):
    self.closed_date = Date(extension)

  def _ParseState(self, extension):
    assert extension.text in ('open', 'closed')
    self.state = extension.text

  def _ParseStatus(self, extension):
    self.status = extension.text

  def _ParseStars(self, extension):
    try:
      self.stars = int(extension.text)
    except ValueError:
      self.stars = 0

  def _ParseOwner(self, extension):
    username_els = extension.FindChildren('username')
    if username_els and len(username_els) > 0:
      uri_el = None
      uri_els = extension.FindChildren('uri')
      if uri_els and len(uri_els) > 0:
        uri_el = uri_els[0]
      self.owner = Person(username_els[0], uri_el, self.url_base)

  def _ParseLabel(self, extension):
    self.labels.add_label(extension.text)

  def _ParseId(self, extension):
    self.issue_id = int(extension.text)

  def _ParseBlockedOn(self, extension):
    for block_id_el in extension.FindChildren('id'):
      self.blockedon_ids.append(block_id_el.text)


class Person(object):
  """A Person that has some relationship with an Issue."""

  def __init__(self, name, uri, url_base):
    """
    Args:
      name: atom.XmlElement or atom.ExtensionElement containing the Person
          name or username.
      uri: atom.XmlElement or atom.ExtensionElement containing a relative
          URI pointing to the Person profile page.
      url_base: str that contains the base URL to turn the 'uri' parameter
          into an absolute URL.
    """
    # The person username, could also contain the (obfuscated) email.
    self.name = name.text

    # The uri linking back to the person profile on Google Code.
    self.uri = None
    if uri:
      self.uri = '%s%s' % (url_base, uri.text)


class Content(object):
  """The issue content, aka description."""

  def __init__(self, atom_content):
    """
    Args:
      atom_content: atom.data.Content
    """
    self._type = atom_content.type
    self._text = atom_content.text

  @property
  def is_html(self):
    return str(self._type).lower() == 'html'

  @property
  def text(self):
    return self._text


class Date(object):
  """A date related to the Issue."""

  def __init__(self, atom_date):
    """
    Args:
      atom_date: atom.data.Updated, atom.data.Published type or a closedDate
          extension, all of which have a 'text' property with dates formatted
          as in this example: 2008-07-20T14:48:23.000Z
    """
    self.date = datetime.datetime.strptime(atom_date.text,
                                           '%Y-%m-%dT%H:%M:%S.000Z')

  @property
  def date_yyyy_mm_dd(self):
    return self.date.strftime('%Y-%m-%d')

  @property
  def days_ago(self):
    delta = datetime.datetime.utcnow() - self.date
    return max(delta.days, 0)


class Labels(object):
  """The set of labels assigned to the Issue."""

  def __init__(self):
    self._labels = []

  def add_label(self, raw_text):
    """Adds one label to the list of Issue labels.

    Args:
      raw_text: The raw label text (e.g.: 'Priority-High', 'Usability').
    """
    dash_pos = raw_text.find('-', 1, -1)
    if dash_pos >= 0:
      # Label contains a '-' in any position apart from the first and last
      # character are treated as composite labels.
      self._labels.append(Label(raw_text[:dash_pos], raw_text[dash_pos+1:]))
    else:
      self._labels.append(Label(raw_text))

  def __iter__(self):
    return self._labels.__iter__()


class Label(object):
  """An Issue label.

  Labels can be composite or plain. A composite label is divided by the dash
  (-) symbol into a prefix and suffix, defining a category-entry relationship
  (e.g. "Priority-High"). Plain labels do not have such characteristic.
  """

  def __init__(self, prefix, suffix=None):
    """Creates a new Label.

    Args:
      prefix: The label prefix (for a composite label) or the entire label text
          for plain labels.
      suffix: The label suffix (for a composite label) or None for plain labels.
    """
    self.prefix = prefix
    self.suffix = suffix

  @property
  def text(self):
    """Returns the entire raw label text."""
    if self.suffix:
      return '%s-%s' % (self.prefix, self.suffix)
    else:
      return self.prefix

  @property
  def is_composite(self):
    return self.suffix is not None


class IssueStats(object):
  """Aggregated statistics about a collection of Issues."""

  def __init__(self):
    # The entire set of issue owners and reporters (creators) of all the
    # analyzed issues.
    self._owners = set()
    self._has_unassigned_issues = False
    self._reporters = set()
    self._has_issues_with_no_reporters = False

    # The range of issue publishing (creation), update and closing dates.
    self.created = {'minyear': 9999, 'maxyear': 0, 'daysago': 0}
    self.updated = {'minyear': 9999, 'maxyear': 0, 'daysago': 0}

    self._has_closed_dates = False
    self._closed_date = {'minyear': 9999, 'maxyear': 0, 'daysago': 0}

    # Dict mapping label keys (which are safe javascript variable names) to the
    # set() of existing values, for all the composite labels found.
    self.composite_labels_values = {}

    # Dict mapping label keys to their user-facing name, for all the composite
    # labels found.
    self.composite_labels_names = {}

    # The set of all plain labels found among the analyzed issues.
    self.plain_labels = set()

  def Compute(self, issues):
    """Extracts statistics from a list of issues."""
    for issue in issues:
      # Issue owner and reporter
      if issue.owner:
        self._owners.add(issue.owner.name)
      else:
        self._has_unassigned_issues = True

      if issue.reporter:
        self._reporters.add(issue.reporter.name)
      else:
        self._has_issues_with_no_reporters = True

      # Issue published (created), updated and (if available), closed date
      self._ComputeDateStats(self.created, issue.created)
      self._ComputeDateStats(self.updated, issue.updated)
      if issue.closed_date:
        self._has_closed_dates = True
        self._ComputeDateStats(self._closed_date, issue.closed_date)

      # Issue labels.
      for label in issue.labels:
        if label.is_composite:
          label_key = SanitizeJsKey(label.prefix)
          self.composite_labels_values.setdefault(
              label_key, set()).add(label.suffix)
          self.composite_labels_names[label_key] = label.prefix
        else:
          self.plain_labels.add(label.text)

  def _ComputeDateStats(self, date_stats, issue_date):
    """Updates date ranges from the values contained in a single issue date."""
    date_stats['minyear'] = min(date_stats['minyear'], issue_date.date.year)
    date_stats['maxyear'] = max(date_stats['maxyear'], issue_date.date.year)
    date_stats['daysago'] = max(date_stats['daysago'], issue_date.days_ago)

  @property
  def closed_date(self):
    """Returns the range of closed date, or None if no issue has been closed."""
    if not self._has_closed_dates:
      return None
    return self._closed_date

  @property
  def owners(self):
    """Returns a sorted list of all issue owners.

    If issues with no assigned owner exist, the special UNASSINGED_OWNER is
    added in front of the list.
    """
    owners = sorted(ow for ow in self._owners)
    if self._has_unassigned_issues:
      owners.insert(0, UNASSIGNED_OWNER)
    return owners

  @property
  def reporters(self):
    """Returns a sorted list of all issue reporters.

    If issues with unknown reporter exist, the special UNKNOWN_REPORTER is
    added in front of the list.
    """
    reporters = sorted(rep for rep in self._reporters)
    if self._has_issues_with_no_reporters:
      reporters.insert(0, UNKNOWN_REPORTER)
    return reporters


class JSONHelper(object):
  """Helper class to convert Issues and Stats to JSON format."""

  def __init__(self):
    self._escape_table = {
      '&': '&amp;',
      '"': '&quot;',
      '\'': '&#39;',
      '<': '&lt;',
      '>': '&gt;',
      '\\': '\\\\',
      '\t': ' ',
    }

  def IssueToJSON(self, issue):
    """Converts an Issue to a JSON string."""
    json = {}
    json['id'] = issue.issue_id
    json['html_link'] = issue.html_link
    json['summary'] = self._Escape(issue.summary)
    json['state'] = issue.state
    json['status'] = self._Escape(issue.status)
    json['stars'] = issue.stars
    if issue.owner:
      json['owner_name'] = self._Escape(issue.owner.name)
      json['owner_uri'] = issue.owner.uri
    else:
      json['owner_name'] = UNASSIGNED_OWNER
      json['owner_uri'] = None

    if issue.reporter:
      json['reporter_name'] = self._Escape(issue.reporter.name)
      json['reporter_uri'] = issue.reporter.uri
    else:
      json['reporter_name'] = UNKNOWN_REPORTER
      json['reporter_uri'] = None

    json['created'] = [issue.created.date.year,
                       issue.created.date.month,
                       issue.created.date.day,
                       issue.created.days_ago]
    json['updated'] = [issue.updated.date.year,
                       issue.updated.date.month,
                       issue.updated.date.day,
                       issue.updated.days_ago]
    json['closed_date'] = None
    if issue.closed_date:
      json['closed_date'] = [issue.closed_date.date.year,
                             issue.closed_date.date.month,
                             issue.closed_date.date.day]

    json['blocked'] = len(issue.blockedon_ids) > 0
    json['blocked_on'] = issue.blockedon_ids

    for label in issue.labels:
      if label.is_composite:
        json.setdefault(SanitizeJsKey(label.prefix), []).append(label.suffix)
      else:
        json.setdefault('plain_labels', []).append(label.text)

    return simplejson.dumps(json)

  def StatsToJSON(self, stats):
    """Converts IssueStats to a JSON string."""
    json = {
      'owners': stats.owners,
      'reporters': stats.reporters,
      'created': stats.created,
      'updated': stats.updated,
      'plain_labels': [label for label in stats.plain_labels],
      'composite_labels': self._BuildCompositeLabels(stats)
    }
    if stats.closed_date:
      json['closed_date'] = stats.closed_date
    return simplejson.dumps(json)

  def _BuildCompositeLabels(self, stats):
    composite_labels = {'values': {}, 'names': stats.composite_labels_names}
    for key, label_values in stats.composite_labels_values.iteritems():
      composite_labels['values'][key] = [value for value in label_values]
    return composite_labels

  def _Escape(self, text):
    if not text:
      return ""
    return "".join(self._escape_table.get(c,c) for c in text)
