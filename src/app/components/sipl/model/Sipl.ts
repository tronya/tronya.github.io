/**
 *    ATTENTION !!!
 *    This file is generated.
 *    Manual changes get lost with the next run of the code generation.
 *
 *    created by yacg (template: typescript.mako v1.0.0)
 */
export interface DetectorEdgeInterface {
    type: number;
    /**
     * Time offset
     */
    timeOff: number;
}
export declare class DetectorEdge implements DetectorEdgeInterface {
    type: number;
    /**
     * Time offset
     */
    timeOff: number;
    constructor(data: DetectorEdgeInterface);
    static fromDeserialized(data: any): DetectorEdge;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
export declare enum DetectorEdgeType {
    UNKNOWN = 0,
    FALLING = 1,
    RISING = 2
}
export interface DetectorStateInterface {
    id: number;
    edges?: DetectorEdge[];
    state: number;
}
export declare class DetectorState implements DetectorStateInterface {
    id: number;
    edges?: DetectorEdge[];
    state: number;
    constructor(data: DetectorStateInterface);
    static fromDeserialized(data: any): DetectorState;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
export declare enum DetectorStateType {
    UNKNOWN = 0,
    FREE = 1,
    OCCU = 2,
    REQ = 3,
    PERM_OCCU = 4,
    ERR = 5
}
export interface MappingInterface {
    id: number;
    name: string;
}
export declare class Mapping implements MappingInterface {
    id: number;
    name: string;
    constructor(data: MappingInterface);
    static fromDeserialized(data: any): Mapping;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
/**
 * Mappings for names
 */
export interface MapsInterface {
    detectors?: Mapping[];
    outputs?: Mapping[];
    sigGrp?: Mapping[];
}
export declare class Maps implements MapsInterface {
    detectors?: Mapping[];
    outputs?: Mapping[];
    sigGrp?: Mapping[];
    constructor(data: MapsInterface);
    static fromDeserialized(data: any): Maps;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
export interface NodeStateInterface {
    cycCnt: number;
    program: number;
    stage: number;
    /**
     * Stage count
     */
    stgCnt: number;
    /**
     * Stage transition
     */
    stgTran: number;
}
export declare class NodeState implements NodeStateInterface {
    cycCnt: number;
    program: number;
    stage: number;
    /**
     * Stage count
     */
    stgCnt: number;
    /**
     * Stage transition
     */
    stgTran: number;
    constructor(data: NodeStateInterface);
    static fromDeserialized(data: any): NodeState;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
export interface OutputStateInterface {
    /**
     * output id
     */
    id: number;
    state: number;
}
export declare class OutputState implements OutputStateInterface {
    /**
     * output id
     */
    id: number;
    state: number;
    constructor(data: OutputStateInterface);
    static fromDeserialized(data: any): OutputState;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
export declare enum OutputStateType {
    UNKNOWN = 0,
    OFF = 1,
    ON = 2,
    BNK_ON = 3,
    BNK_ON_2HZ = 4,
    BNK_OFF = 5,
    BNK_OFF_2HZ = 6
}
export interface InputStateInterface {
    /**
     * input id
     */
    id: number;
    state: number;
}
export declare class InputState implements InputStateInterface {
    /**
     * input id
     */
    id: number;
    state: number;
    constructor(data: InputStateInterface);
    static fromDeserialized(data: any): InputState;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
export declare enum InputStateType {
    UNKNOWN = "UNKNOWN",
    OFF = "OFF",
    ON = "ON"
}
export interface ValuesInterface {
    detValues?: DetectorState[];
    nodes?: NodeState[];
    outputs?: OutputState[];
    inputs?: InputState[];
    sigState?: SignalGroupState[];
    /**
     * Offset in ms from bucketStart
     */
    offset: number;
}
export declare class Values implements ValuesInterface {
    detValues?: DetectorState[];
    nodes?: NodeState[];
    outputs?: OutputState[];
    inputs?: InputState[];
    sigState?: SignalGroupState[];
    /**
     * Offset in ms from bucketStart
     */
    offset: number;
    constructor(data: ValuesInterface);
    static fromDeserialized(data: any): Values;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
export interface SignalGroupStateInterface {
    /**
     * Identifier of the signal group
     */
    id: number;
    /**
     * reference to Intersection->SingalGroup.guid
     */
    intSgId: string;
    /**
     * Signal state value for this signalgroup red greeen flashing
     */
    sgState: number;
}
export declare class SignalGroupState implements SignalGroupStateInterface {
    /**
     * Identifier of the signal group
     */
    id: number;
    /**
     * reference to Intersection->SingalGroup.guid
     */
    intSgId: string;
    /**
     * Signal state value for this signalgroup red greeen flashing
     */
    sgState: number;
    constructor(data: SignalGroupStateInterface);
    static fromDeserialized(data: any): SignalGroupState;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
/**
* Model describes data that defines the base type structure from traffic engineering
    perspective
*/
export interface SignalGroupInterface {
    /**
     * object specific ID of that entry
     */
    guid: string;
    /**
     * name of the signal program
     */
    name?: string;
    /**
     * local id in the controller
     */
    channel: number;
    externalId?: string;
    /**
     * optional, additional information
     */
    comment?: string;
}
export declare class SignalGroup implements SignalGroupInterface {
    /**
     * object specific ID of that entry
     */
    guid: string;
    /**
     * name of the signal program
     */
    name?: string;
    /**
     * local id in the controller
     */
    channel: number;
    externalId?: string;
    /**
     * optional, additional information
     */
    comment?: string;
    constructor(data: SignalGroupInterface);
    static fromDeserialized(data: any): SignalGroup;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
export declare enum SignalGroupStateType {
    UNKNOWN = 0,
    DARK = 1,
    RED = 2,
    AMB = 3,
    GRN = 4,
    RED_AMB = 5,
    RED_GRN = 6,
    RED_AMB_GRN = 7,
    AMB_GRN = 8,
    RED_FLASH = 9,
    AMB_FLASH = 10,
    GRN_FLASH = 11,
    MIN_GRN = 12,
    REST_GRN = 13,
    GRN_EXT = 14,
    PAST_END_GRN = 15,
    RED_CLR_AND_MIN = 16,
    REST_RED = 17,
    RED_REQ = 18,
    RED_PR = 19,
    RED_PRIV = 20,
    RED_STOP_CONF = 21,
    RESERVED = 22,
    START_STOP_INT = 23,
    RED_NO_EXT_INFO = 24,
    GRN_NO_EXT_INFO = 25,
    VEHICLE_CALL = 26,
    PED_CALL = 27,
    ON = 28,
    NEXT = 29
}
/**
 * Container for sipl data
 */
export interface SignalStateBucketInterface {
    /**
     * How large a bucket is in seconds
     */
    size?: number;
    /**
                    * Start of the bucket Example if this would be a minute bucket start would be
    on second 0
                    */
    start: Date;
    /**
     * End of the bucket
     */
    end?: Date;
    /**
     * reference to the tlc object for that intersection
     */
    tlcId: string;
    maps?: Maps;
    /**
     * some nodeid
     */
    nodeId?: number;
    values?: Values[];
    /**
     * The difference between the datetime object s value and UTC In minutes
     */
    tzOff?: number;
}
export declare class SignalStateBucket implements SignalStateBucketInterface {
    /**
     * How large a bucket is in seconds
     */
    size?: number;
    /**
    * Start of the bucket Example if this would be a minute bucket start would be
    on second 0
    */
    start: Date;
    /**
     * End of the bucket
     */
    end?: Date;
    /**
     * reference to the tlc object for that intersection
     */
    tlcId: string;
    maps?: Maps;
    /**
     * some nodeid
     */
    nodeId?: number;
    values?: Values[];
    /**
     * The difference between the datetime object s value and UTC In minutes
     */
    tzOff?: number;
    constructor(data: SignalStateBucketInterface);
    static fromDeserialized(data: any): SignalStateBucket;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
/**
 * A TLC
 */
export interface TLCInterface {
    guid?: string;
    name?: string;
    systemNr?: string;
    subSystemNr?: string;
    externalId?: string;
    /**
     * location of this TLC
     */
    location?: GeoPoint;
    /**
     * the common field contain all un-modeled stuff
     */
    comment?: string;
    /**
     * protocol that is used to communicate with the tlc
     */
    protocol?: string;
    nodes?: TLCNode[];
    shortName?: string;
    tenantId?: string;
}
export declare class TLC implements TLCInterface {
    guid?: string;
    name?: string;
    systemNr?: string;
    subSystemNr?: string;
    externalId?: string;
    /**
     * location of this TLC
     */
    location?: GeoPoint;
    /**
     * the common field contain all un-modeled stuff
     */
    comment?: string;
    /**
     * protocol that is used to communicate with the tlc
     */
    protocol?: string;
    nodes?: TLCNode[];
    shortName?: string;
    tenantId?: string;
    constructor(data: TLCInterface);
    static fromDeserialized(data: any): TLC;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
/**
 * Single point geo-type
 */
export interface GeoPointInterface {
    /**
     * geographic projection used for this point
     */
    projection?: string;
    /**
     * longitude of the point
     */
    lon: number;
    /**
     * latitude of the point
     */
    lat: number;
}
export declare class GeoPoint implements GeoPointInterface {
    /**
     * geographic projection used for this point
     */
    projection?: string;
    /**
     * longitude of the point
     */
    lon: number;
    /**
     * latitude of the point
     */
    lat: number;
    constructor(data: GeoPointInterface);
    static fromDeserialized(data: any): GeoPoint;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
/**
* representation of an intersection - aka relative node (OCIT), all things
    are running in the same program
*/
export interface TLCNodeInterface {
    intersectionId?: string;
    subNodes?: TLCSubNode[];
    detectors?: Detector[];
    signalPrograms?: SignalProgram[];
    outputs?: Output[];
    trafficSituations?: TrafficSituation[];
    signals?: Signal[];
    /**
     * unique in the scope of the parent object
     */
    id: string;
    name: string;
    comment?: string;
}
export declare class TLCNode implements TLCNodeInterface {
    intersectionId?: string;
    subNodes?: TLCSubNode[];
    detectors?: Detector[];
    signalPrograms?: SignalProgram[];
    outputs?: Output[];
    trafficSituations?: TrafficSituation[];
    signals?: Signal[];
    /**
     * unique in the scope of the parent object
     */
    id: string;
    name: string;
    comment?: string;
    constructor(data: TLCNodeInterface);
    static fromDeserialized(data: any): TLCNode;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
/**
 * A simple common id/name tupel
 */
export interface IdNamePairInterface {
    /**
     * unique in the scope of the parent object
     */
    id: string;
    name: string;
    comment?: string;
}
export declare class IdNamePair implements IdNamePairInterface {
    /**
     * unique in the scope of the parent object
     */
    id: string;
    name: string;
    comment?: string;
    constructor(data: IdNamePairInterface);
    static fromDeserialized(data: any): IdNamePair;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
/**
 * representation of an intersection, all things are running in the same program
 */
export interface TLCSubNodeInterface {
    /**
     * unique in the scope of the parent object
     */
    id: string;
    name: string;
    comment?: string;
}
export declare class TLCSubNode implements TLCSubNodeInterface {
    /**
     * unique in the scope of the parent object
     */
    id: string;
    name: string;
    comment?: string;
    constructor(data: TLCSubNodeInterface);
    static fromDeserialized(data: any): TLCSubNode;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
/**
 * representation of an intersection, all things are running in the same program
 */
export interface DetectorInterface {
    /**
     * unique in the scope of the parent object
     */
    id: string;
    name: string;
    comment?: string;
}
export declare class Detector implements DetectorInterface {
    /**
     * unique in the scope of the parent object
     */
    id: string;
    name: string;
    comment?: string;
    constructor(data: DetectorInterface);
    static fromDeserialized(data: any): Detector;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
/**
 * software that controls
 */
export interface SignalProgramInterface {
    /**
     * unique in the scope of the parent object
     */
    id: string;
    name: string;
    comment?: string;
}
export declare class SignalProgram implements SignalProgramInterface {
    /**
     * unique in the scope of the parent object
     */
    id: string;
    name: string;
    comment?: string;
    constructor(data: SignalProgramInterface);
    static fromDeserialized(data: any): SignalProgram;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
/**
 * Magic value for the well-being of TLCs
 */
export interface OutputInterface {
    /**
     * unique in the scope of the parent object
     */
    id: string;
    name: string;
    comment?: string;
}
export declare class Output implements OutputInterface {
    /**
     * unique in the scope of the parent object
     */
    id: string;
    name: string;
    comment?: string;
    constructor(data: OutputInterface);
    static fromDeserialized(data: any): Output;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
/**
 * Some kind of a scenarion e.g.
 */
export interface TrafficSituationInterface {
    /**
     * unique in the scope of the parent object
     */
    id: string;
    name: string;
    comment?: string;
}
export declare class TrafficSituation implements TrafficSituationInterface {
    /**
     * unique in the scope of the parent object
     */
    id: string;
    name: string;
    comment?: string;
    constructor(data: TrafficSituationInterface);
    static fromDeserialized(data: any): TrafficSituation;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
/**
 * group of traffic lights that show the same color
 */
export interface SignalInterface {
    signalHeads?: SignalHead[];
    /**
     * optional
     */
    subNodeRef?: string;
    /**
     * unique in the scope of the parent object
     */
    id: string;
    name: string;
    comment?: string;
}
export declare class Signal implements SignalInterface {
    signalHeads?: SignalHead[];
    /**
     * optional
     */
    subNodeRef?: string;
    /**
     * unique in the scope of the parent object
     */
    id: string;
    name: string;
    comment?: string;
    constructor(data: SignalInterface);
    static fromDeserialized(data: any): Signal;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
/**
 * A TLC/node adress, it's reused e.g. in the intersection model
 */
export interface TLCNodeAddressInterface {
    /**
     * UUID that points to a TLC object
     */
    tlcGuid?: string;
    nodeId?: string;
}
export declare class TLCNodeAddress implements TLCNodeAddressInterface {
    /**
     * UUID that points to a TLC object
     */
    tlcGuid?: string;
    nodeId?: string;
    constructor(data: TLCNodeAddressInterface);
    static fromDeserialized(data: any): TLCNodeAddress;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
/**
 * basically one traffic light
 */
export interface SignalHeadInterface {
}
export declare class SignalHead implements SignalHeadInterface {
    constructor(data: SignalHeadInterface);
    static fromDeserialized(data: any): SignalHead;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
export interface DataConfirmationEventInterface {
    /**
     * A reference to the device
     */
    deviceId: string;
    /**
     * Name of data type
     */
    archiveType: string;
    timeRange: TimeRange;
    /**
     * A reference to data object
     */
    reference: string;
}
export declare class DataConfirmationEvent implements DataConfirmationEventInterface {
    /**
     * A reference to the device
     */
    deviceId: string;
    /**
     * Name of data type
     */
    archiveType: string;
    timeRange: TimeRange;
    /**
     * A reference to data object
     */
    reference: string;
    constructor(data: DataConfirmationEventInterface);
    static fromDeserialized(data: any): DataConfirmationEvent;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
/**
 * Data time range
 */
export interface TimeRangeInterface {
    /**
     * Data range start
     */
    start: Date;
    /**
     * Data range end
     */
    end: Date;
}
export declare class TimeRange implements TimeRangeInterface {
    /**
     * Data range start
     */
    start: Date;
    /**
     * Data range end
     */
    end: Date;
    constructor(data: TimeRangeInterface);
    static fromDeserialized(data: any): TimeRange;
    static getMetaData(): {
        parents: [];
        namespace: string;
        name: string;
        fullName: string;
    };
    toSerializable(): any;
}
