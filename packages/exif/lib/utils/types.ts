export interface ILogger {
  (...args: any[]): void
  verbose(...args: any[]): void
}

export type IBufferLike = Buffer | Uint8Array

export enum Endian {
  Big,
  Little,
}

export const BIG_ENDIAN_MARKER = 0x4d4d
export const LITTLE_ENDIAN_MARKER = 0x4949

export interface IReader {
  hasNext(): boolean
  getPosition(): number
  getEndianess(): Endian
  setEndianess(endian: Endian): void
  read(length: number): number
  readAsString(length: number): string
  readAsBuffer(length: number): IBufferLike
  readAsReader(length: number): IReader
  skip(diff: number): void
  seek(position: number): void
  use<T>(func: () => T): T
}

export interface IWriter {
  getPosition(): number
  setEndianess(endian: Endian): void
  write(data: number, length?: number): void
  writeBuffer(data: IBufferLike): void
  skip(diff: number): void
  seek(position: number): void
  toBuffer(): IBufferLike
}

export interface IDecoder {
  extractMetadata(): IGenericMetadata
}

export interface IIFD {
  offset: number
  nextIFDOffset: number
  parent?: IIFD
  children: IIFD[]
  entries: IIFDEntry[]

  isEXIF: boolean
}

export interface IIFDEntry {
  startOffset: number
  tag: number
  dataType: number
  length: number
  getValue(reader?: IReader): string | number
}

export interface IIFDOffset {
  offset: number
  parent?: IIFD
}

export interface IIFDTagDefinition {
  name: IFDTagName
  code: number
  group: IFDGroup
  dataType: IFDDataType
}

export enum IFDTag {
  Compression = 259,
  StripOffsets = 273,
  SamplesPerPixel = 277,
  RowsPerStrip = 278,
  StripByteCounts = 279,
  XResolution = 282,
  YResolution = 283,
  SubIFD = 330,
  ThumbnailOffset = 513,
  ThumbnailLength = 514,
  EXIFOffset = 34665,
}

export enum IFDGroup {
  Image = 0,
  EXIF = 1,
  GPS = 2,
}

export enum IFDDataType {
  Unknown = 0,
  Byte = 1,
  String = 2,
  Short = 3,
  Long = 4,
  Rational = 5,
  SignedByte = 6,
  Undefined = 7,
  SignedShort = 8,
  SignedLong = 9,
  SignedRational = 10,
  // From https://www.media.mit.edu/pia/Research/deepview/exif.html
  Float = 11,
  Double = 12,
}

export interface IWriterOptions {
  dangerouslyAvoidCopy?: boolean
}

export interface IJPEGOptions {
  skipMetadata?: boolean
}

export type IGenericMetadata = Partial<Record<IFDTagName | XMPTagName, string | number | undefined>>

export interface IParsedLens {
  make?: string
  model: string
  focalLength?: string
  aperture?: string
}

export interface INormalizedMetadata {
  _raw: IGenericMetadata

  make?: string
  model?: string

  width?: number
  height?: number
  xResolution?: number
  yResolution?: number

  createdAt?: Date
  modifiedAt?: Date

  iso?: number
  exposureTime?: number
  fNumber?: number
  focalLength?: number
  normalizedFocalLength?: number

  exposureCompensation?: number

  lens?: IParsedLens

  // XMP metadata
  rating?: number
  colorLabel?: 'Blue' | 'Red' | 'Purple' | 'Yellow' | 'Green'
  keywords?: string[]
}

export function getDataTypeSize(dataType: number, name?: string | number): number {
  switch (dataType) {
    case IFDDataType.Unknown: // ???
    case IFDDataType.Byte: // byte
    case IFDDataType.String: // ASCII-string
    case IFDDataType.SignedByte:
      return 1
    case IFDDataType.Short: // word
    case IFDDataType.SignedShort:
      return 2
    case IFDDataType.Long: // double word
    case IFDDataType.SignedLong:
    case IFDDataType.Float:
    case IFDDataType.Undefined:
      return 4
    case IFDDataType.Rational: // rational number
    case IFDDataType.SignedRational:
    case IFDDataType.Double:
      return 8
    default: {
      const nameComponent = name ? ` for name (${name})` : ''
      throw new TypeError(`unknown datatype${nameComponent}: ${dataType}`)
    }
  }
}

export type XMPTagName = 'Rating' | 'Label' | 'MetadataDate' | 'DCSubjectBagOfWords'

export type IFDTagName =
  | 'Unknown'
  | 'ImageWidth'
  | 'NewSubfileType'
  | 'SubfileType'
  | 'ImageWidth'
  | 'ImageLength'
  | 'BitsPerSample'
  | 'Compression'
  | 'PhotometricInterpretation'
  | 'Thresholding'
  | 'CellWidth'
  | 'CellLength'
  | 'FillOrder'
  | 'DocumentName'
  | 'ImageDescription'
  | 'Make'
  | 'Model'
  | 'StripOffsets'
  | 'Orientation'
  | 'SamplesPerPixel'
  | 'RowsPerStrip'
  | 'StripByteCounts'
  | 'MinSampleValue'
  | 'MaxSampleValue'
  | 'XResolution'
  | 'YResolution'
  | 'PlanarConfiguration'
  | 'PageName'
  | 'XPosition'
  | 'YPosition'
  | 'FreeOffsets'
  | 'FreeByteCounts'
  | 'GrayResponseUnit'
  | 'GrayResponseCurve'
  | 'T4Options'
  | 'T6Options'
  | 'ResolutionUnit'
  | 'PageNumber'
  | 'ColorResponseUnit'
  | 'TransferFunction'
  | 'Software'
  | 'ModifyDate'
  | 'Artist'
  | 'HostComputer'
  | 'Predictor'
  | 'WhitePoint'
  | 'PrimaryChromaticities'
  | 'ColorMap'
  | 'HalftoneHints'
  | 'TileWidth'
  | 'TileLength'
  | 'TileOffsets'
  | 'TileByteCounts'
  | 'BadFaxLines'
  | 'CleanFaxData'
  | 'ConsecutiveBadFaxLines'
  | 'SubIFD'
  | 'InkSet'
  | 'InkNames'
  | 'NumberOfInks'
  | 'DotRange'
  | 'TargetPrinter'
  | 'ExtraSamples'
  | 'SampleFormat'
  | 'SMinSampleValue'
  | 'SMaxSampleValue'
  | 'TransferRange'
  | 'ClipPath'
  | 'XClipPathUnits'
  | 'YClipPathUnits'
  | 'Indexed'
  | 'JPEGTables'
  | 'OPIProxy'
  | 'GlobalParametersIFD'
  | 'ProfileType'
  | 'FaxProfile'
  | 'CodingMethods'
  | 'VersionYear'
  | 'ModeNumber'
  | 'Decode'
  | 'DefaultImageColor'
  | 'T82Options'
  | 'JPEGProc'
  | 'JPEGInterchangeFormat'
  | 'JPEGInterchangeFormatLength'
  | 'JPEGRestartInterval'
  | 'JPEGLosslessPredictors'
  | 'JPEGPointTransforms'
  | 'JPEGQTables'
  | 'JPEGDCTables'
  | 'JPEGACTables'
  | 'YCbCrCoefficients'
  | 'YCbCrSubSampling'
  | 'YCbCrPositioning'
  | 'ReferenceBlackWhite'
  | 'StripRowCounts'
  | 'XMLPacket'
  | 'USPTOMiscellaneous'
  | 'RelatedImageFileFormat'
  | 'RelatedImageWidth'
  | 'RelatedImageHeight'
  | 'Rating'
  | 'XP_DIP_XML'
  | 'StitchInfo'
  | 'RatingPercent'
  | 'ImageID'
  | 'WangTag1'
  | 'WangAnnotation'
  | 'WangTag3'
  | 'WangTag4'
  | 'Matteing'
  | 'DataType'
  | 'ImageDepth'
  | 'TileDepth'
  | 'Model2'
  | 'CFARepeatPatternDim'
  | 'CFAPattern'
  | 'BatteryLevel'
  | 'KodakIFD'
  | 'Copyright'
  | 'ExposureTime'
  | 'FNumber'
  | 'MDFileTag'
  | 'MDScalePixel'
  | 'MDColorTable'
  | 'MDLabName'
  | 'MDSampleInfo'
  | 'MDPrepDate'
  | 'MDPrepTime'
  | 'MDFileUnits'
  | 'PixelScale'
  | 'AdventScale'
  | 'AdventRevision'
  | 'UIC1Tag'
  | 'UIC2Tag'
  | 'UIC3Tag'
  | 'UIC4Tag'
  | 'IPTC-NAA'
  | 'IntergraphPacketData'
  | 'IntergraphFlagRegisters'
  | 'IntergraphMatrix'
  | 'INGRReserved'
  | 'ModelTiePoint'
  | 'Site'
  | 'ColorSequence'
  | 'IT8Header'
  | 'RasterPadding'
  | 'BitsPerRunLength'
  | 'BitsPerExtendedRunLength'
  | 'ColorTable'
  | 'ImageColorIndicator'
  | 'BackgroundColorIndicator'
  | 'ImageColorValue'
  | 'BackgroundColorValue'
  | 'PixelIntensityRange'
  | 'TransparencyIndicator'
  | 'ColorCharacterization'
  | 'HCUsage'
  | 'TrapIndicator'
  | 'CMYKEquivalent'
  | 'SEMInfo'
  | 'AFCP_IPTC'
  | 'PixelMagicJBIGOptions'
  | 'ModelTransform'
  | 'WB_GRGBLevels'
  | 'LeafData'
  | 'PhotoshopSettings'
  | 'EXIFTag'
  | 'InterColorProfile'
  | 'TIFF_FXExtensions'
  | 'MultiProfiles'
  | 'SharedData'
  | 'T88Options'
  | 'ImageLayer'
  | 'GeoTiffDirectory'
  | 'GeoTiffDoubleParams'
  | 'GeoTiffAsciiParams'
  | 'ExposureProgram'
  | 'SpectralSensitivity'
  | 'GPSTag'
  | 'ISO'
  | 'Opto-ElectricConvFactor'
  | 'Interlace'
  | 'TimeZoneOffset'
  | 'SelfTimerMode'
  | 'SensitivityType'
  | 'StandardOutputSensitivity'
  | 'RecommendedExposureIndex'
  | 'ISOSpeed'
  | 'ISOSpeedLatitudeyyy'
  | 'ISOSpeedLatitudezzz'
  | 'FaxRecvParams'
  | 'FaxSubAddress'
  | 'FaxRecvTime'
  | 'LeafSubIFD'
  | 'EXIFVersion'
  | 'DateTimeOriginal'
  | 'CreateDate'
  | 'ComponentsConfiguration'
  | 'CompressedBitsPerPixel'
  | 'ShutterSpeedValue'
  | 'ApertureValue'
  | 'BrightnessValue'
  | 'ExposureCompensation'
  | 'MaxApertureValue'
  | 'SubjectDistance'
  | 'MeteringMode'
  | 'LightSource'
  | 'Flash'
  | 'FocalLength'
  | 'FlashEnergy'
  | 'SpatialFrequencyResponse'
  | 'Noise'
  | 'FocalPlaneXResolution'
  | 'FocalPlaneYResolution'
  | 'FocalPlaneResolutionUnit'
  | 'ImageNumber'
  | 'SecurityClassification'
  | 'ImageHistory'
  | 'SubjectArea'
  | 'ExposureIndex'
  | 'TIFFEPStandardID'
  | 'SensingMethod'
  | 'CIP3DataFile'
  | 'CIP3Sheet'
  | 'CIP3Side'
  | 'StoNits'
  | 'MakerNote'
  | 'UserComment'
  | 'SubSecTime'
  | 'SubSecTimeOriginal'
  | 'SubSecTimeDigitized'
  | 'MSDocumentText'
  | 'MSPropertySetStorage'
  | 'MSDocumentTextPosition'
  | 'ImageSourceData'
  | 'XPTitle'
  | 'XPComment'
  | 'XPAuthor'
  | 'XPKeywords'
  | 'XPSubject'
  | 'FlashpixVersion'
  | 'ColorSpace'
  | 'EXIFImageWidth'
  | 'EXIFImageHeight'
  | 'RelatedSoundFile'
  | 'InteropOffset'
  | 'SubjectLocation'
  | 'TIFF-EPStandardID'
  | 'FileSource'
  | 'SceneType'
  | 'CustomRendered'
  | 'ExposureMode'
  | 'WhiteBalance'
  | 'DigitalZoomRatio'
  | 'FocalLengthIn35mmFormat'
  | 'SceneCaptureType'
  | 'GainControl'
  | 'Contrast'
  | 'Saturation'
  | 'Sharpness'
  | 'DeviceSettingDescription'
  | 'SubjectDistanceRange'
  | 'ImageUniqueID'
  | 'OwnerName'
  | 'SerialNumber'
  | 'LensMake'
  | 'LensModel'
  | 'LensSerialNumber'
  | 'GDALMetadata'
  | 'GDALNoData'
  | 'Gamma'
  | 'ExpandSoftware'
  | 'ExpandLens'
  | 'ExpandFilm'
  | 'ExpandFilterLens'
  | 'ExpandScanner'
  | 'ExpandFlashLamp'
  | 'PixelFormat'
  | 'Transformation'
  | 'Uncompressed'
  | 'ImageType'
  | 'WidthResolution'
  | 'HeightResolution'
  | 'ImageOffset'
  | 'ImageByteCount'
  | 'AlphaOffset'
  | 'AlphaByteCount'
  | 'ImageDataDiscard'
  | 'AlphaDataDiscard'
  | 'OceScanjobDesc'
  | 'OceApplicationSelector'
  | 'OceIDNumber'
  | 'OceImageLogic'
  | 'Annotations'
  | 'PrintImageMatching'
  | 'USPTOOriginalContentType'
  | 'DNGVersion'
  | 'DNGBackwardVersion'
  | 'UniqueCameraModel'
  | 'LocalizedCameraModel'
  | 'CFAPlaneColor'
  | 'CFALayout'
  | 'LinearizationTable'
  | 'BlackLevelRepeatDim'
  | 'BlackLevel'
  | 'BlackLevelDeltaH'
  | 'BlackLevelDeltaV'
  | 'WhiteLevel'
  | 'DefaultScale'
  | 'DefaultCropOrigin'
  | 'DefaultCropSize'
  | 'ColorMatrix1'
  | 'ColorMatrix2'
  | 'CameraCalibration1'
  | 'CameraCalibration2'
  | 'ReductionMatrix1'
  | 'ReductionMatrix2'
  | 'AnalogBalance'
  | 'AsShotNeutral'
  | 'AsShotWhiteXY'
  | 'BaselineExposure'
  | 'BaselineNoise'
  | 'BaselineSharpness'
  | 'BayerGreenSplit'
  | 'LinearResponseLimit'
  | 'CameraSerialNumber'
  | 'LensInfo'
  | 'ChromaBlurRadius'
  | 'AntiAliasStrength'
  | 'ShadowScale'
  | 'DNGPrivateData'
  | 'MakerNoteSafety'
  | 'RawImageSegmentation'
  | 'CalibrationIlluminant1'
  | 'CalibrationIlluminant2'
  | 'BestQualityScale'
  | 'RawDataUniqueID'
  | 'AliasLayerMetadata'
  | 'OriginalRawFileName'
  | 'OriginalRawFileData'
  | 'ActiveArea'
  | 'MaskedAreas'
  | 'AsShotICCProfile'
  | 'AsShotPreProfileMatrix'
  | 'CurrentICCProfile'
  | 'CurrentPreProfileMatrix'
  | 'ColorimetricReference'
  | 'PanasonicTitle'
  | 'PanasonicTitle2'
  | 'CameraCalibrationSignature'
  | 'ProfileCalibrationSignature'
  | 'ProfileIFD'
  | 'AsShotProfileName'
  | 'NoiseReductionApplied'
  | 'ProfileName'
  | 'ProfileHueSatMapDims'
  | 'ProfileHueSatMapData1'
  | 'ProfileHueSatMapData2'
  | 'ProfileToneCurve'
  | 'ProfileEmbedPolicy'
  | 'ProfileCopyright'
  | 'ForwardMatrix1'
  | 'ForwardMatrix2'
  | 'PreviewApplicationName'
  | 'PreviewApplicationVersion'
  | 'PreviewSettingsName'
  | 'PreviewSettingsDigest'
  | 'PreviewColorSpace'
  | 'PreviewDateTime'
  | 'RawImageDigest'
  | 'OriginalRawFileDigest'
  | 'SubTileBlockSize'
  | 'RowInterleaveFactor'
  | 'ProfileLookTableDims'
  | 'ProfileLookTableData'
  | 'OpcodeList1'
  | 'OpcodeList2'
  | 'OpcodeList3'
  | 'NoiseProfile'
  | 'TimeCodes'
  | 'FrameRate'
  | 'TStop'
  | 'ReelName'
  | 'OriginalDefaultFinalSize'
  | 'OriginalBestQualitySize'
  | 'OriginalDefaultCropSize'
  | 'CameraLabel'
  | 'ProfileHueSatMapEncoding'
  | 'ProfileLookTableEncoding'
  | 'BaselineExposureOffset'
  | 'DefaultBlackRender'
  | 'NewRawImageDigest'
  | 'RawToPreviewGain'
  | 'DefaultUserCrop'
  | 'Padding'
  | 'OffsetSchema'
  | 'OwnerName'
  | 'SerialNumber'
  | 'Lens'
  | 'KDC_IFD'
  | 'RawFile'
  | 'Converter'
  | 'WhiteBalance'
  | 'Exposure'
  | 'Shadows'
  | 'Brightness'
  | 'Contrast'
  | 'Saturation'
  | 'Sharpness'
  | 'Smoothness'
  | 'MoireFilter'
  | 'GPSVersionID'
  | 'GPSLatitudeRef'
  | 'GPSLatitude'
  | 'GPSLongitudeRef'
  | 'GPSLongitude'
  | 'GPSAltitudeRef'
  | 'GPSAltitude'
  | 'GPSTimeStamp'
  | 'GPSSatellites'
  | 'GPSStatus'
  | 'GPSMeasureMode'
  | 'GPSDOP'
  | 'GPSSpeedRef'
  | 'GPSSpeed'
  | 'GPSTrackRef'
  | 'GPSTrack'
  | 'GPSImgDirectionRef'
  | 'GPSImgDirection'
  | 'GPSMapDatum'
  | 'GPSDestLatitudeRef'
  | 'GPSDestLatitude'
  | 'GPSDestLongitudeRef'
  | 'GPSDestLongitude'
  | 'GPSDestBearingRef'
  | 'GPSDestBearing'
  | 'GPSDestDistanceRef'
  | 'GPSDestDistance'
  | 'GPSProcessingMethod'
  | 'GPSAreaInformation'
  | 'GPSDateStamp'
  | 'GPSDifferential'
  | 'GPSHPositioningError'
