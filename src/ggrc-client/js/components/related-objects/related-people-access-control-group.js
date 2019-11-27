/*
  Copyright (C) 2020 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import loFind from 'lodash/find';
import loFindIndex from 'lodash/findIndex';
import canMap from 'can-map';
import canComponent from 'can-component';
import {
  isSnapshot,
} from '../../plugins/utils/snapshot-utils';
import {isAllowedFor} from '../../permission';

export default canComponent.extend({
  tag: 'related-people-access-control-group',
  leakScope: true,
  viewModel: canMap.extend({
    define: {
      canEdit: {
        get: function () {
          let instance = this.attr('instance');
          let canEdit = !this.attr('isReadonly') &&
            !isSnapshot(instance) &&
            !instance.attr('archived') &&
            !instance.attr('_is_sox_restricted') &&
            !this.attr('readOnly') &&
            !this.attr('updatableGroupId') &&
            (this.attr('isNewInstance') ||
              this.attr('isProposal') ||
              isAllowedFor('update', instance)) &&
            !this.attr('isDisabledRole');

          return canEdit;
        },
      },
      isLoading: {
        get: function () {
          return this.attr('updatableGroupId') ===
            this.attr('groupId');
        },
      },
      placeholder: {
        get: function () {
          return this.attr('singleUserRole') ?
            'Change person' : 'Add person';
        },
      },
      isDisabledRole: {
        get() {
          return this.attr('disabledRoles').attr().includes(this.attr('title'));
        },
      },
      tooltip: {
        get() {
          const roleTooltip = this.attr('rolesTooltips').attr()
            .find((roleTooltip) => roleTooltip.role === this.attr('title'));
          return roleTooltip ? roleTooltip.tooltip : '';
        },
      },
    },
    disabledRoles: [],
    rolesTooltips: [],
    instance: {},
    isNewInstance: false,
    groupId: '',
    title: '',
    singleUserRole: false,
    people: [],
    isDirty: false,
    required: false,
    backUpPeople: [],
    autoUpdate: false,
    updatableGroupId: null,
    readOnly: false,
    isProposal: false,
    changeEditableGroup: function (args) {
      if (args.editableMode) {
        this.attr('backUpPeople', this.attr('people').attr());
      } else {
        this.attr('isDirty', false);
        this.attr('people', this.attr('backUpPeople').attr());
      }
    },
    saveChanges: function () {
      if (this.attr('isDirty')) {
        this.attr('isDirty', false);
        this.dispatch({
          type: 'updateRoles',
          people: this.attr('people'),
          roleId: this.attr('groupId'),
          roleTitle: this.attr('title'),
        });
      }
    },
    personSelected: function (args) {
      this.addPerson(args.person, args.groupId);
    },
    addPerson: function (person, groupId) {
      let exist = loFind(this.attr('people'), {id: person.id});

      if (exist) {
        console.warn(
          `User "${person.id}" already has role "${groupId}" assigned`);
        return;
      }

      this.attr('isDirty', true);

      if (this.attr('singleUserRole')) {
        this.attr('people').replace(person);
      } else {
        this.attr('people').push(person);
      }

      if (this.attr('autoUpdate')) {
        this.saveChanges();
      }
    },
    removePerson: function (args) {
      let person = args.person;
      let idx = loFindIndex(
        this.attr('people'),
        {id: person.id});

      if (idx === -1) {
        console.warn(`User "${person.id}" does not present in "people" list`);
        return;
      }

      this.attr('isDirty', true);
      this.attr('people').splice(idx, 1);

      if (this.attr('autoUpdate')) {
        this.saveChanges();
      }
    },
  }),
  events: {
    init: function () {
      let vm = this.viewModel;
      vm.attr('backUpPeople', vm.attr('people').attr());
    },
  },
});
