/* @author yanjun.zsj
 * @date 2018.11
*/
import React from 'react';
import { getOffset } from './util';
import Line from './line';
import _ from 'lodash';
import { DrawLinesProps, DrawLinesState } from './types';

export interface DomOperateTypes {
  key: string;
  left: number;
  top: number;
}
const defaultState = {
  drawing: false,
  endX: 0,
  endY: 0,
  sourceData: {},
  startX: 0,
  startY: 0,
};

class DrawLines extends React.Component<DrawLinesProps, DrawLinesState> {
  drawEle: HTMLElement;

  static defaultProps = {
    onDrawStart: (): void => {},
    onDrawing: (): void => {},
    onDrawEnd: (): void => {}
  };

  baseXY = {
    left: 0,
    top: 0
  };

  constructor(props) {
    super(props);
    this.state = {
      ...defaultState
    };
  }

  componentDidMount(): void {
    this.baseXY = getOffset(this.drawEle);
    const box = document.querySelector('.react-field-mapping-box');
    let scrollTop = 0;
    let scrollLeft = 0;
    let sourceDom = null;
    document.documentElement.onmousedown = (event): void => {
      const eventDom = event.target as unknown as HTMLElement;
      sourceDom = eventDom;
      const className = eventDom && eventDom.className || '';
      if (className && typeof className === "string" && className.indexOf("source-column-icon") > -1) {
        event.preventDefault();
        const relation = _.assign([], this.props.relation);
        if (!this.props.sourceMutiple && _.find(relation, (o) => {
          return o.source.key === this.domOperate(eventDom).key;
        })) {
          return;
        }
        if (this.baseXY !== getOffset(this.drawEle)) {
          this.baseXY = getOffset(this.drawEle);
        }
        let scrollEle = box;
        document.body.classList.add("user-select-none");
        const sourceData = _.find(this.props.sourceData, (o) => {
          return o.key === this.domOperate(eventDom).key;
        });
        this.props.onDrawStart(sourceData, this.props.relation);
        this.props.changeIconStatus(sourceData);
        this.setState({
          startX: this.domOperate(eventDom).left,
          startY: this.domOperate(eventDom).top,
          endX: this.domOperate(eventDom).left,
          endY: this.domOperate(eventDom).top,
          drawing: true,
          sourceData
        });
        while (scrollEle.tagName !== 'BODY') {
          scrollTop += scrollEle.scrollTop;
          scrollLeft += scrollEle.scrollLeft;
          scrollEle = scrollEle.parentElement;
        }
      }
    };
    document.documentElement.onmousemove = (event): void => {
      if (this.state.drawing) {
        this.props.onDrawing(this.state.sourceData, this.props.relation);
        this.setState({
          endX: event.pageX - this.baseXY.left + scrollLeft,
          endY: event.pageY - this.baseXY.top + scrollTop
        });
      }
    };
    document.documentElement.onmouseup = (event): void => {
      document.body.classList.remove("user-select-none");
      const { startX, startY, sourceData } = this.state;
      const eventDom = event.target as unknown as HTMLElement;
      const className = eventDom && eventDom.className || '';
      if (className && typeof className === "string" && className.indexOf("target-column-icon") > -1) {
        const relation = _.assign([], this.props.relation);
        if (!this.props.targetMutiple && _.find(relation, (o) => {// target不允许映射多次
          return o.target.key === this.domOperate(eventDom).key;
        }) || _.find(relation, (o) => { // 过滤连线已存在的情况
          return o.target.key === this.domOperate(eventDom).key && o.source.key === this.domOperate(sourceDom).key;
        })) {
          this.props.changeIconStatus();
          this.setState({...defaultState});
          sourceDom = null;
          return;
        }
        const targetData = _.find(this.props.targetData, (o) => {
          return o.key === this.domOperate(eventDom).key;
        });
        relation.push({
          source: {
            x: startX,
            y: startY,
            ...sourceData
          },
          target: {
            x: this.domOperate(eventDom).left,
            y: this.domOperate(eventDom).top,
            ...targetData
          }
        });
        this.props.onDrawEnd(sourceData, targetData, relation);
        this.props.onChange(relation);
        sourceDom = null;
      }
      this.props.changeIconStatus();
      this.setState({...defaultState});
      scrollTop = 0;
      scrollLeft = 0;
    };
  }

  domOperate(eventDom): DomOperateTypes {
    return {
      key: eventDom.offsetParent.getAttribute('data-key'),
      left: getOffset(eventDom).left - this.baseXY.left + 3,
      top: getOffset(eventDom).top - this.baseXY.top + 6
    };
  }
  removeRelation = (removeNode): void => {
    const relation = _.assign([], this.props.relation);
    _.remove(relation, item => {
      return (item === removeNode);
    });
    this.props.onChange(relation);
  }
  topLine = (item): void => {
    const relation = _.assign([], this.props.relation);
    _.remove(relation, (n) => {
      return n === item;
    });
    relation.push(item);
    this.props.onChange(relation, false);
  }
  render(): React.ReactElement {
    const { startX, startY, drawing, endX, endY } = this.state;
    const { relation, currentRelation, edit, closeIcon } = this.props;
    return <div className="lines-area" ref={(me): void => {
      this.drawEle = me;
    }}>
      <svg width="100%" height="100%" version="1.1" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker
            className="path"
            id="markerArrow"
            markerWidth="12"
            markerHeight="12"
            refX="6"
            refY="6"
            orient="auto">
            <path d="M2,4 L5,6 L2,8 L9,6 L2,4" className="arrow" />
          </marker>
        </defs>
        <g>
          {relation.filter(item => {
            return item.source.key && item.target.key;
          }).map(item => <Line
            key={`${item.source.key}-${item.target.key}`}
            startX={item.source.x}
            startY={item.source.y}
            endX={item.target.x}
            endY={item.target.y}
            data={item}
            edit={edit}
            closeIcon={closeIcon}
            toTop={this.topLine}
            currentRelation={currentRelation}
            removeRelation={this.removeRelation}
          />)}
        </g>
        {drawing && <g className="path">
            <path
              className="line"
              d={`M${startX}, ${startY} L${endX}, ${endY}`}
              strokeDasharray="5,5"
              markerEnd="url(#markerArrow)"
            />
        </g>}
      </svg>

    </div>;
  }
}

export default DrawLines;
