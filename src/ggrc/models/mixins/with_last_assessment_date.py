# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Contains WithLastAssessmentDate mixin.

This defines logic to get finished_date fields of the last Assessment over all
Snapshots of self.
"""

import sqlalchemy as sa

from ggrc.builder import simple_property
from ggrc import db
from ggrc.models.assessment import Assessment
from ggrc.models.snapshot import Snapshot
from ggrc.models.relationship import Relationship


class WithLastAssessmentDate(object):
  """Defines logic to get max finished_date of all Asmts over own Snapshots."""
  # pylint: disable=too-few-public-methods

  _publish_attrs = ["last_assessment_date"]
  _update_attrs = []

  @classmethod
  def eager_query(cls):
    query = super(WithLastAssessmentDate, cls).eager_query()
    return query.options(
        sa.orm.subqueryload("_related_assessments")
        .undefer_group("Assesment_complete"),
    )

  @simple_property
  def last_assessment_date(self):
    if self._related_assessments:
      # here we rely on order_by defined on self._related_assessments
      # pylint: disable=unsubscriptable-object
      return self._related_assessments[0].finished_date
    else:
      return None

  @sa.ext.declarative.declared_attr
  def _related_assessments(self):
    """Add Assessments over own Snapshots."""

    sr_assessment_src = db.session.query(
        Relationship.source_id.label("assessment_id"),
        Snapshot.child_id.label("self_id"),
    ).join(
        Snapshot,
        sa.and_(Relationship.source_type == "Assessment",
                Relationship.destination_id == Snapshot.id,
                Relationship.destination_type == "Snapshot"),
    ).filter(
        Snapshot.child_type == self.__name__,
    )
    sr_assessment_dst = db.session.query(
        Relationship.destination_id.label("assessment_id"),
        Snapshot.child_id.label("self_id"),
    ).join(
        Snapshot,
        sa.and_(Relationship.destination_type == "Assessment",
                Relationship.source_id == Snapshot.id,
                Relationship.source_type == "Snapshot"),
    ).filter(
        Snapshot.child_type == self.__name__,
    )

    snapshot_relationship = sa.orm.aliased(
        sr_assessment_src.union_all(sr_assessment_dst).subquery(),
    )

    def secondaryjoin():
      return Assessment.id == snapshot_relationship.c.assessment_id

    def primaryjoin():
      return self.id == snapshot_relationship.c.self_id

    return db.relationship(
        Assessment,
        primaryjoin=primaryjoin,
        secondary=snapshot_relationship,
        secondaryjoin=secondaryjoin,
        viewonly=True,
        order_by=Assessment.finished_date.desc(),
    )
