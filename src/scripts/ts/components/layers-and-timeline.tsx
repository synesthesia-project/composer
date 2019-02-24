import {styled} from './styling';
import {Layer} from './layer';
import {Timeline} from './timeline';
import * as React from 'react';
import * as func from '../data/functional';
import * as file from '@synesthesia-project/core/file';
import * as selection from '../data/selection';
import * as util from '@synesthesia-project/core/util';
import * as stageState from '../data/stage-state';
import * as playState from '../data/play-state';

export interface LayersAndTimelineProps {
  // Properties
  className?: string;
  selection: selection.Selection;
  file: func.Maybe<file.CueFile>;
  state: stageState.StageState;
  playState: playState.PlayState;
  bindingLayer: func.Maybe<number>;
  midiLayerBindings: {input: string, note: number, layer: number}[];
  // Callbacks
  timelineRef: (ref: HTMLDivElement | null) => void;
  layersRef: (ref: HTMLDivElement | null) => void;
  updateCueFile: util.Mutator<file.CueFile>;
  updateSelection: util.Mutator<selection.Selection>;
  requestBindingForLayer: (layerKey: number | null) => void;
  openLayerOptions: (layerKey: number) => void;
}

export interface LayersAndTimelineState {
  /** Current position in milliseconds, updated every so often based on frame-rate */
  positionMillis: number;
  mousePosition: func.Maybe<number>;
  /**
   * If the user is currently dragging the selected elements, then
   * this is the difference in milliseconds
   */
  selectionDraggingDiff: number | null;
}

class LayersAndTimeline extends React.Component<LayersAndTimelineProps, LayersAndTimelineState> {

  private updateInterval: number;

  constructor(props: LayersAndTimelineProps) {
    super(props);
    this.state = {
      positionMillis: 0,
      mousePosition: func.none(),
      selectionDraggingDiff: null
    };
    this.updateMouseHover = this.updateMouseHover.bind(this);
    this.updateSelectionDraggingDiff = this.updateSelectionDraggingDiff.bind(this);
  }

  public componentDidMount() {
    this.updatePositionInterval(this.props);
  }

  public componentWillReceiveProps(newProps: LayersAndTimelineProps) {
    this.updatePositionInterval(newProps);
  }

  private updatePositionInterval(newProps: LayersAndTimelineProps) {
    cancelAnimationFrame(this.updateInterval);
    const playState = newProps.playState;
    if (playState) {
      // Start a re-rendering interval if currently playing
      if (playState.state.type === 'playing') {
        const update = () => {
          this.updatePosition(playState);
          this.updateInterval = requestAnimationFrame(update);
        };
        this.updateInterval = requestAnimationFrame(update);
      }
      this.updatePosition(playState);
    }
  }

  private updatePosition(playState: playState.PlayStateData) {
    const time = playState.state.type === 'paused' ?
      playState.state.positionMillis :
      (new Date().getTime() - playState.state.effectiveStartTimeMillis) * playState.state.playSpeed;
        // Update positionMillis with time if different enough
    if (time < this.state.positionMillis - 10 || time > this.state.positionMillis + 10)
      this.setState({ positionMillis: time });
  }

  private updateMouseHover(mousePosition: func.Maybe<number>) {
    this.setState({mousePosition});
  }

  private updateSelectionDraggingDiff(selectionDraggingDiff: number | null): void {
    this.setState({selectionDraggingDiff});
  }

  public render() {
    let layers = this.props.file.caseOf({
      just: cueFile => cueFile.layers.map((layer, i) =>
        <Layer
          key={i}
          file={cueFile}
          layerKey={i}
          layer={layer}
          zoom={this.props.state.zoom}
          selection={this.props.selection}
          positionMillis={this.state.positionMillis}
          bindingLayer={this.props.bindingLayer}
          midiLayerBindings={this.props.midiLayerBindings}
          selectionDraggingDiff={this.state.selectionDraggingDiff}
          updateSelection={this.props.updateSelection}
          updateCueFile={this.props.updateCueFile}
          requestBindingForLayer={this.props.requestBindingForLayer}
          updateSelectionDraggingDiff={this.updateSelectionDraggingDiff}
          openLayerOptions={this.props.openLayerOptions}
          />
      ),
      none: () => []
    });

    const zoomMargin = stageState.relativeZoomMargins(this.props.state.zoom);

    const playerPosition = this.props.file.fmap(file => this.state.positionMillis / file.lengthMillis);

    return (
      <div className={this.props.className}>
        <div
          className="layers"
          ref={layers => this.props.layersRef(layers)}>
          {layers}
          <div className="overlay">
            <div className="zoom" style={{
                left: (- zoomMargin.left * 100) + '%',
                right: (- zoomMargin.right * 100) + '%'
              }}>
              {playerPosition.caseOf({
                just: position => <div className="marker player-position" style={{left: position * 100 + '%'}}/>,
                none: () => null
              })}
              {this.state.mousePosition.caseOf({
                just: position => <div className="marker mouse" style={{left: position * 100 + '%'}}/>,
                none: () => null
              })}
            </div>
          </div>
        </div>
        {this.props.file.caseOf({
          just: cueFile => <Timeline
            timelineRef={this.props.timelineRef}
            updateCueFile={this.props.updateCueFile}
            file={cueFile}
            zoom={this.props.state.zoom}
            positionMillis={this.state.positionMillis}
            playState={this.props.playState}
            updateMouseHover={this.updateMouseHover}
            mousePosition={this.state.mousePosition}
            />,
          none: () => null
        })}
      </div>
    );
  }

}

const StyledLayersAndTimeline = styled(LayersAndTimeline)`
  flex-grow: 1;
  display: flex;
  flex-direction: column;

  > .layers {
    flex-grow: 1;
    position: relative;
    overflow-y: hidden;

    &::before, &::after {
      box-sizing: border-box;
      content: "";
      display: block;
      background: ${p => p.theme.layerSideBg};
      position: absolute;
      height: 100%;
      top: 0;
      z-index: -100;
      opacity: 0.6;
      box-shadow: 0px 0px 8px 0px rgba(0,0,0,0.3);
    }

    &::before {
      width: ${p => p.theme.layerSideColumnWidthPx}px;
      left: 0;
      border-right: 1px solid ${p => p.theme.borderLight};
    }

    &::after {
      width: ${p => p.theme.visualizationWidthPx}px;
      right: 0;
      border-left: 1px solid ${p => p.theme.borderLight};
    }

    > .overlay {
      position: absolute;
      pointer-events: none;
      top: 0;
      bottom: 0;
      left: ${p => p.theme.layerSideColumnWidthPx}px;
      right: ${p => p.theme.visualizationWidthPx}px;
      overflow: hidden;

      > .zoom {
        position: absolute;
        top: 0;
        bottom: 0;
        right: 50%;
        left: -50%;

        > .marker {
          position: absolute;
          height: 100%;
          width: 1px;

          &.player-position {
            background: rgba(255, 255, 255, 0.2);
          }

          &.mouse {
            background: rgba(255, 255, 255, 0.4);
          }
        }
      }
    }
  }
`;

export {StyledLayersAndTimeline as LayersAndTimeline};
