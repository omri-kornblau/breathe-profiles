import React from 'react';
import {
  Row,
  Col,
  Button,
  Input,
  Form,
  Table,
  Container
} from 'reactstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import _ from 'lodash';

import SVGpath from './SVGpath';
import Everpolate from 'everpolate';

import './App.css';
import { useState } from 'react';

const startPoint = { x: 0, y: 0 };
const endPoint = { x: 10, y: 0 };

const xRange = { min: 0, max: 10 };
const yRange = { min: 0, max: 255 };

const xUiRange = { min: 0, max: 600 };
const yUiRange = { min: 0, max: 300 };

const xRatio = xUiRange.max / xRange.max;
const yRatio = yUiRange.max / yRange.max;

class Point extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isMousePressed: false,
      position: { x: props.x, y: props.y },
    };
  }
  componentWillReceiveProps(props) {
    this.setState({ position: props })
  }

  render() {
    if (this.state.isMousePressed) {
      document.onmousemove = e => {
        if (this.state.isMousePressed) {
          const ex = { target: { name: "x", value: (e.x - 23)/xRatio} }
          const ey = { target: { name: "y", value: (yUiRange.max - e.y)/yRatio } }
          this.setState({ position: { x: ex.target.value , y:  ey.target.value } });
          this.props.onInput(ex);
          this.props.onInput(ey);
        }
      }

      document.onmouseup = e => {
        this.setState({ isMousePressed: false });
      }
    }

    const pointStyle = {
      left: `${this.state.position.x * xRatio}px`,
      bottom: `${this.state.position.y * yRatio}px`,
    }
    const pointS = {
      width: `${this.props.size}px`,
      height: `${this.props.size}px`,
      left: `${this.props.size/2}px`,
      top: `${this.props.size/2}px`,
    };
    return (
      <div draggable={false} style={pointStyle} className="wanted-point-container" >
        <div draggable={false} style={pointS}
          className="wanted-point"
          onMouseDown={e => this.setState({ isMousePressed: true })}
          onMouseMove={e => {
            if (this.state.isMousePressed) {
              const ex = { target: { name: "x", value: (e.x - 23)/xRatio.toFixed(1)} }
              const ey = { target: { name: "y", value: (yUiRange.max - e.y + 5)/yRatio.toFixed(1) } }
              this.setState({ position: { x: ex.target.value , y:  ey.target.value } });
              this.props.onInput(ex);
              this.props.onInput(ey);
            }
          }}
        />
      </div>
    );
  }
}

const PointData = props => {
  return (
    <tr>
      <td>{props.idx + 1}</td>
      <td>
        <Input value={props.x} step={0.5} type="number" required onInput={props.onInput} name="x" placeholder="X"></Input>
      </td>
      <td>
        <Input value={props.y} step={10} type="number" required onInput={props.onInput} name="y" placeholder="Y"></Input>
      </td>
      <td><Button onClick={props.onDelete} className="btn-sm" color="danger">X</Button></td>
    </tr>
  );
}

const multPS = (t, p) => ({ x: t * p.x, y: t * p.y });
const addPoints = (p0, p1) => ({ x: p0.x + p1.x, y: p0.y + p1.y });
const subPoints = (p0, p1) => ({ x: p0.x - p1.x, y: p0.y - p1.y });

const getM = (p0, p1, p2, mag) => {
  if (!p0 || !p1 || p1.y >= yRange.max || p1.y <= yRange.min) {
    return { x: mag, y: 0 };
  }
  const p0p1 = multPS(1, subPoints(p1, p0));
  const p1p2 = multPS(1, subPoints(p2, p1));
  return multPS(0.5, addPoints(p0p1, p1p2));
}

const getHermitePolynomFn = (p0, p1, p2, p3, mag) => t => {
  const m1 = getM(p0, p1, p2, mag);
  const m2 = getM(p1, p2, p3, mag);
  const pointsToSum = [
    multPS(2*t*t*t - 3*t*t +1, p1),
    multPS(t*t*t -2*t*t + t, m1),
    multPS(-2*t*t*t + 3*t*t, p2),
    multPS(t*t*t - t*t, m2)
  ];
  return pointsToSum.reduce(addPoints, { x: 0, y: 0 });
}

const createHermitePath = (wantedPoints, mag) => {
  const pointsBetween = 100;
  return wantedPoints.slice(1).map((point, idx) => {
    const i = Number(idx) + 2;
    const getInterPoint = getHermitePolynomFn(
      wantedPoints[i-3],
      wantedPoints[i-2],
      wantedPoints[i-1],
      wantedPoints[i],
      mag
    );
    return _.range(0, 1, 1 / pointsBetween).map(t => getInterPoint(t));
  });
}

class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      wantedPoints: [
        startPoint,
        endPoint
      ],
      newPoint: { x: 1, y: 0 },
      mag: 6,
      pointsAmount: 250,
      output: "",
      selectedPoint: null
    };
  }
  renderWantedPoints = () => {
    return this.state.wantedPoints.map((point, idx) =>
      <Point selected={this.state.selectedPoint === idx} onInput={this.editWantedPoint(idx)} key={`p-${idx}`} x={point.x} y={point.y}/>
    )
  }
  renderPath = () => {
    const paths = createHermitePath(this.state.wantedPoints, this.state.mag)
    return paths.map(path =>
      <SVGpath
        className="path"
        color="#555555"
        points={path.map(point => ({ x: point.x * xRatio, y: point.y * yRatio}))}
        strokeWidth={3}
        progress={1}
        trace={false}
      />
    )
  }
  onInput = e => {
    const { name, value } = e.target;
    const state = this.state;
    state[name] = value
    this.setState(state);
  }
  onPointInput = e => {
    const { name, value } = e.target;
    const { newPoint }= this.state;
    newPoint[name] = value;
    this.setState({ newPoint })
  }
  onFileLoad = e => {
    const fileReader = new FileReader();
    fileReader.onloadend = () => {
      try {
        const savedState = JSON.parse(fileReader.result);
        this.setState(savedState);
      } catch(err) {
        console.error("Json is corrupted");
      }
    }

    fileReader.readAsText(e.target.files[0]);
  }
  createTextFile = () => {
    const amountOfPoints = this.state.pointsAmount;
    const step = xRange.max / amountOfPoints;
    const paths = createHermitePath(this.state.wantedPoints, this.state.mag);
    const path = _.flatten(paths);
    const xs = path.map(point => point.x);
    const ys = path.map(point => point.y);
    let finalXs = _.range(0, xRange.max, step);
    let finalYs = Everpolate.linear(finalXs, xs, ys);
    let vels = finalYs.slice(1).map((yVal, idx) => (yVal - finalYs[idx]) / step);
    vels.push(0);
    finalYs = finalYs.map(Math.round).map(Math.abs).map(yVal => Math.min(yVal, yRange.max));
    vels = vels.map(vel => vel / 5).map(vel => vel + 128).map(Math.round);

    const posPrefix = "byte pos[profile_length]={";
    const velPrefix = "byte vel[profile_length]={";
    const posEnd = "};";
    const finalText = `${posPrefix}${finalYs.join(",")}${posEnd}\n${velPrefix}${vels.join(",")}${posEnd}`;

    this.setState({ output: finalText });
  }
  addWantedPoint = e => {
    e.preventDefault();
    const { wantedPoints, newPoint } = this.state;
    wantedPoints.push(_.clone(newPoint));
    const sortedPoints = _.sortBy(wantedPoints, point => Number(point.x));
    newPoint.x = Number(newPoint.x) + 1;
    this.setState({ wantedPoints: sortedPoints, newPoint });
    e.target.reset();
  }
  editWantedPoint = idx => e => {
    const { name, value } = e.target;
    const { wantedPoints } = this.state;
    wantedPoints[idx][name] = Math.max(value, 0);
    this.setState({ wantedPoints, selectedPoint: idx });
  }
  removeWantedPoint = point => () => {
    const { wantedPoints } = this.state;
    this.setState({ wantedPoint: _.remove(wantedPoints, point) });
  }

  render() {
    const graphSizingStyle = {
      width: `${xUiRange.max - xUiRange.min}px`,
      height: `${yUiRange.max - yUiRange.min}px`
    }
    return (
      <>
        <div className="ml-4 mr-4 app">
          <Row>
          <Col xs="6">
          <div style={graphSizingStyle} className="graph-area">
            {this.renderWantedPoints()}
            <svg style={graphSizingStyle} transform="scale(1,-1)">
              {this.renderPath()}
            </svg>
          </div></Col>
          <Col xs="6" className="text-center">
            <Table className="main-table table-bordered table-sm mt-4">
              <thead>
                <tr>
                  <th>#</th>
                  <th>X</th>
                  <th>Y</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {this.state.wantedPoints.map((point, idx) => (
                  <PointData
                    onDelete={this.removeWantedPoint(point)}
                    onInput={this.editWantedPoint(idx)}
                    idx={idx}
                    key={`pd-${idx}`}
                    x={point.x}
                    y={point.y}
                  />
                ))}
              </tbody>
            </Table>
          </Col>
          </Row>
          <Row>
            <Col xs="6">
              <Form onSubmit={this.addWantedPoint}>
                <Row className="mt-4">
                  <Col>
                    <Input value={this.state.newPoint.x} type="number" required onInput={this.onPointInput} name="x" placeholder="X"></Input>
                  </Col>
                  <Col>
                    <Input type="number" required onInput={this.onPointInput} name="y" placeholder="Y"></Input>
                  </Col>
                  <Button type="submit" color="success">+</Button>
                </Row>
              </Form>
              <Row className="justify-content-center mt-4">
                <label className="ml-3"> Output points: </label>
                <Col xs="3">
                  <Input name="pointsAmount" onInput={this.onInput} value={this.state.pointsAmount}/>
                </Col>
                <label className="ml-3"> Magnitude: </label>
                <Col xs="3">
                  <Input name="mag" type="number" onInput={this.onInput} value={this.state.mag}></Input>
                </Col>
              </Row>
              <Row className="justify-content-around mt-3">
                <Button type="submit" onClick={this.createTextFile} color="danger">Get Text</Button>
                <a href={`data:application/xml;charset=utf-8, ${JSON.stringify(this.state)}`} download="myProfile.json">Save</a>
                <Col xs="5">
                  <Input accept=".json" type="file" onChange={this.onFileLoad}/>
                </Col>
              </Row>
              <Input type="textarea" rows="5" className="mt-3" value={this.state.output}></Input>
            </Col>
          </Row>
        </div>
      </>
    );
  }
}

export default App;
