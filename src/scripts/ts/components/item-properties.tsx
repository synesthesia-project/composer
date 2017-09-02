import {BaseComponent} from './base';
import * as React from 'react';
import * as file from '../shared/file/file';
import * as selection from '../data/selection';
import * as text from '../display/text';
import * as fileManipulation from '../data/file-manipulation';
import * as types from '../shared/util/types';
import {DelayedPropigationInput} from './util/input';

import Delete = require('react-icons/lib/md/delete');

interface EventPropertiesProps {
  // Properties
  selection: selection.Selection;
  file: file.CueFile;
  // Callbacks
  updateCueFileAndSelection: types.Mutator<[file.CueFile, selection.Selection]>;
}

export class EventProperties extends BaseComponent<EventPropertiesProps, {}> {

  public constructor() {
    super();

    // Bind callbacks & event listeners
    this.onStartTimeChange = this.onStartTimeChange.bind(this);
    this.onDurationChange = this.onDurationChange.bind(this);
    this.onDelete = this.onDelete.bind(this);
    this.onSpread = this.onSpread.bind(this);
  }

  private getEvent(e: {layer: number, index: number}) {
    return this.props.file.layers[e.layer].events[e.index];
  }

  private getEarliestStartTime() {
    const startTimes = this.props.selection.events.map(e => this.getEvent(e).timestampMillis);
    return Math.round(Math.min.apply(null, startTimes));
  }

  private getCommonDuration() {
    let commonDuration: number | null = null;
    for (const e of this.props.selection.events) {
      const eventDuration = (() => {
        const event = this.getEvent(e);
        if (event.states.length === 0) {
          // Get default duration for this layer
          const layer = this.props.file.layers[e.layer];
          if (layer.kind === 'percussion') {
            return layer.settings.defaultLengthMillis;
          } else {
            throw new Error('unable to determine length of event');
          }
        } else {
          return Math.max.apply(null, event.states.map(s => s.millisDelta)) as number;
        }
      })();
      if (commonDuration === null) {
        commonDuration = eventDuration;
      } else if (commonDuration !== eventDuration) {
        // Durations differ, return null.
        return null;
      }
    }
    return commonDuration;
  }

  private onStartTimeChange(value: string) {
    this.props.updateCueFileAndSelection(([f, s]) => [
      fileManipulation.updateStartTimeForSelectedEvents(f, this.props.selection, Number(value)),
      s
    ]);
  }

  private onDurationChange(value: string) {
    this.props.updateCueFileAndSelection(([f, s]) => [
      fileManipulation.updateDurationForSelectedEvents(f, this.props.selection, Number(value)),
      s
    ]);
  }

  private onDelete() {
    this.props.updateCueFileAndSelection(([f, s]) => [
      fileManipulation.deleteSelectedEvents(f, s),
      selection.clearSelectedEvents(s)
    ]);
  }

  private onSpread() {
    this.props.updateCueFileAndSelection(([f, s]) => [
      fileManipulation.distributeSelectedEvents(f, s),
      s
    ]);
  }

  public render() {
    const selectedEvents = this.props.selection.events.length;
    return (
      <externals.ShadowDOM>
        <div>
          <link rel="stylesheet" type="text/css" href="styles/components/item-properties.css"/>
          {selectedEvents > 0 ?
            <div className="selection">{text.pluralize(selectedEvents, 'Item', 'Items')} Selected</div> :
            <div className="selection empty">Nothing Selected</div>
          }
          {selectedEvents > 0 ?
            <div className="properties">
              <div className="property">
                <label htmlFor="startTime" title="Start time in milliseconds">Start Time</label>
                <DelayedPropigationInput
                  id="startTime"
                  type="number"
                  value={String(this.getEarliestStartTime())}
                  onChange={this.onStartTimeChange}/>
              </div>
                <div className="property">
                  <label htmlFor="duration">Event Duration</label>
                  <DelayedPropigationInput
                    id="duration"
                    type="number"
                    value={String(this.getCommonDuration())}
                    onChange={this.onDurationChange}/>
                </div>
              <div className="property">
                <button onClick={this.onDelete} title="Delete"><Delete/></button>
              </div>
              <div className="property" title="Distribute the selected items evenly">
                <button className={selectedEvents === 1 ? 'disabled' : ''}onClick={this.onSpread}>DISTRIBUTE</button>
              </div>
            </div>
            : null
          }
        </div>
      </externals.ShadowDOM>
    );
  }
}
