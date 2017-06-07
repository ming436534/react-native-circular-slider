import React, { PureComponent, PropTypes } from 'react';
import { PanResponder, View, Text } from 'react-native';
import Svg, { Circle, G, LinearGradient, Path, Defs, Stop } from 'react-native-svg';
import range from 'lodash.range';
import { interpolateHcl as interpolateGradient } from 'd3-interpolate';
import ClockFace from './ClockFace';


function calculateArcColor(index0, segments, gradientColorFrom, gradientColorTo) {
  const interpolate = interpolateGradient(gradientColorFrom, gradientColorTo);

  return {
    fromColor: interpolate(index0 / segments),
    toColor: interpolate((index0 + 1) / segments),
  }
}

function calculateArcCircle(index0, segments, radius, startAngle0 = 0, angleLength0 = 2 * Math.PI) {
  // Add 0.0001 to the possible angle so when start = stop angle, whole circle is drawn
  const startAngle = startAngle0 % (2 * Math.PI);
  const angleLength = angleLength0 % (2 * Math.PI);
  const index = index0 + 1;
  const fromAngle = angleLength / segments * (index - 1) + startAngle;
  const toAngle = angleLength / segments * index + startAngle;
  const fromX = radius * Math.sin(fromAngle);
  const fromY = -radius * Math.cos(fromAngle);
  const realToX = radius * Math.sin(toAngle);
  const realToY = -radius * Math.cos(toAngle);

  // add 0.005 to start drawing a little bit earlier so segments stick together
  const toX = radius * Math.sin(toAngle + 0.005);
  const toY = -radius * Math.cos(toAngle + 0.005);

  return {
    fromX,
    fromY,
    toX,
    toY,
    realToX,
    realToY,
  };
}

function getGradientId(index) {
  return `gradient${index}`;
}

export default class CircularSlider extends PureComponent {

  static propTypes = {
    onUpdate: PropTypes.func.isRequired,
    startAngle: PropTypes.number.isRequired,
    angleLength: PropTypes.number.isRequired,
    segments: PropTypes.number,
    strokeWidth: PropTypes.number,
    radius: PropTypes.number,
    gradientColorFrom: PropTypes.string,
    gradientColorTo: PropTypes.string,
    showClockFace: PropTypes.bool,
    clockFaceColor: PropTypes.string,
    bgCircleColor: PropTypes.string,
    stopIcon: PropTypes.element,
    startIcon: PropTypes.element,
    containerStyle: View.propTypes.style,
    text: PropTypes.string,
  }

  static defaultProps = {
    segments: 5,
    strokeWidth: 40,
    radius: 145,
    gradientColorFrom: '#ff9800',
    gradientColorTo: '#ffcf00',
    clockFaceColor: '#9d9d9d',
    bgCircleColor: '#171717',
  }

  state = {
    circleCenterX: false,
    circleCenterY: false,
    containerWidth: this.props.radius,
  }

  componentWillMount() {
    this._sleepPanResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => true,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,

      onPanResponderMove: (evt, { moveX, moveY }) => {
        const { circleCenterX, circleCenterY } = this.state;
        const { angleLength, startAngle, onUpdate } = this.props;

        const currentAngleStop = (startAngle + angleLength) % (2 * Math.PI);
        let newAngle = Math.atan2(moveY - circleCenterY, moveX - circleCenterX) + Math.PI/2;

        if (newAngle < 0) {
          newAngle += 2 * Math.PI;
        }

        let newAngleLength = currentAngleStop - newAngle;

        if (newAngleLength < 0) {
          newAngleLength += 2 * Math.PI;
        }

        onUpdate({ startAngle: newAngle, angleLength: newAngleLength % (2 * Math.PI) });
      },
    });

    this._wakePanResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => true,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,

      onPanResponderMove: (evt, { moveX, moveY }) => {
        const { circleCenterX, circleCenterY } = this.state;
        const { angleLength, startAngle, onUpdate } = this.props;

        let newAngle = Math.atan2(moveY - circleCenterY, moveX - circleCenterX) + Math.PI/2;
        let newAngleLength = (newAngle - startAngle) % (2 * Math.PI);

        if (newAngleLength < 0) {
          newAngleLength += 2 * Math.PI;
        }

        onUpdate({ startAngle, angleLength: newAngleLength });
      },
    });
  }

  onLayout = (evt) => {
    this.setState({
      containerWidth: evt.nativeEvent.layout.width,
    });
    this.setCircleCenter();
  }

  setCircleCenter = () => {
    setTimeout(() => {
      this._view.measure((x, y, w, h, px, py) => {
        this.setState({ circleCenterX: px + w/2, circleCenterY: py + h/2 });
      });
    }, 500);
  }

  getContainerWidth() {
    const { strokeWidth, radius } = this.props;
    return strokeWidth + radius * 2 + 20;
  }

  render() {
    const { startAngle, angleLength, segments, strokeWidth, radius, gradientColorFrom, gradientColorTo, bgCircleColor,
      showClockFace, clockFaceColor, startIcon, stopIcon } = this.props;

    const containerWidth = this.getContainerWidth();

    const start = calculateArcCircle(0, segments, radius, startAngle, angleLength);
    const stop = calculateArcCircle(segments - 1, segments, radius, startAngle, angleLength);
    
    return (
      <View ref={view => this._view = view} style={this.props.containerStyle} onLayout={this.onLayout}>
        <Svg
          height={containerWidth+20}
          width={containerWidth+20}
        >
          <Defs>
            {
              range(segments).map(i => {
                const { fromX, fromY, toX, toY } = calculateArcCircle(i, segments, radius, startAngle, angleLength);
                const { fromColor, toColor } = calculateArcColor(i, segments, gradientColorFrom, gradientColorTo)
                return (
                  <LinearGradient key={i} id={getGradientId(i)} x1={fromX.toFixed(2)} y1={fromY.toFixed(2)} x2={toX.toFixed(2)} y2={toY.toFixed(2)}>
                    <Stop offset="0%" stopColor={fromColor} />
                    <Stop offset="1" stopColor={toColor} />
                  </LinearGradient>
                )
              })
            }
          </Defs>

          {/*
            ##### Circle
          */}

          <G transform={{ translate: `${strokeWidth/2 + radius + 1}, ${strokeWidth/2 + radius + 1}` }}>
            <Circle
              r={radius}
              cx={20}
              cy={20}
              strokeWidth={strokeWidth}
              fill="transparent"
              stroke={bgCircleColor}
            />
            {
              showClockFace && (
                <ClockFace
                  r={radius - strokeWidth / 2}
                  stroke={clockFaceColor}
                />
              )
            }
            {
              range(segments).map(i => {
                const { fromX, fromY, toX, toY } = calculateArcCircle(i, segments, radius, startAngle, angleLength);
                const d = `M ${fromX.toFixed(2)} ${fromY.toFixed(2)} A ${radius} ${radius} 0 0 1 ${toX.toFixed(2)} ${toY.toFixed(2)}`;

                return (
                  <Path
                    d={d}
                    key={i}
                    x={20}
                    y={20}
                    strokeWidth={strokeWidth}
                    stroke={`url(#${getGradientId(i)})`}
                    fill="transparent"
                  />
                )
              })
            }

            {/*
              ##### Stop Icon
            */}

            <G
              fill={gradientColorTo}
              transform={{ translate: `${stop.toX+20}, ${stop.toY+20}` }}
              onPressIn={() => this.setState({ angleLength: angleLength + Math.PI / 2 })}
              {...this._wakePanResponder.panHandlers}
            >
              {
                stopIcon
              }
            </G>

            {/*
              ##### Start Icon
            */}

            <G
              fill={gradientColorFrom}
              transform={{ translate: `${start.fromX+20}, ${start.fromY+20}` }}
              onPressIn={() => this.setState({ startAngle: startAngle - Math.PI / 2, angleLength: angleLength + Math.PI / 2 })}
            >
              {
                startIcon
              }
            </G>
          </G>
        </Svg>
        <View style={{ position: 'absolute', width: 100, top: this.state.containerWidth/2 - 10, right: this.state.containerWidth/2 - 50 }}>
              <Text style={{ color: 'white', fontSize: 20, textAlign: 'center' }}>{this.props.text}</Text>
        </View>
      </View>
    );
  }
}
