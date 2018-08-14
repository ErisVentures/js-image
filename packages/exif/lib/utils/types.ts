export interface ILogger {
  (...args: any[]): void
  verbose(...args: any[]): void
}

export type IBufferLike = Buffer | Uint8Array

export enum Endian {
  Big,
  Little,
}

export interface IReader {
  hasNext(): boolean
  getPosition(): number
  setEndianess(endian: Endian): void
  read(length: number): number
  readAsBuffer(length: number): IBufferLike
  readAsReader(length: number): IReader
  skip(diff: number): void
  seek(position: number): void
  use<T>(func: () => T): T
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
  ImageWidth = 100,
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
  Undefined = 7,
  SignedLong = 9,
  SignedRational = 10,
}

export type IGenericMetadata = Partial<Record<IFDTagName, string | number | undefined>>

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
}

export type IFDTagName =
  | 'Unknown'
  | 'InteropIndex'
  | 'InteropVersion'
  | 'ProcessingSoftware'
  | 'ImageWidth'
  | 'NewSubfileType'
  | 'SubfileType'
  | 'ImageWidth'
  | 'ImageHeight'
  | 'BitsPerSample'
  | 'Compression'
  | 'PhotometricInterpretation'
  | 'Thresholding'
  | 'Threshholding'
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
  | 'DateTime'
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
  | 'NumberofInks'
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
  | 'ThumbnailOffset'
  | 'ThumbnailLength'
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
  | 'ApplicationNotes'
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
  | 'CFAPattern2'
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
  | 'ImageResources'
  | 'EXIFTag'
  | 'EXIFOffset'
  | 'InterColorProfile'
  | 'ICC_Profile'
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
  | 'GPSInfo'
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
  | 'TIFF-EPStandardID'
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
  | 'ImageHeight'
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
  | 'PrintIM'
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
  | 'DNGLensInfo'
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
  | 'CameraCalibrationSig'
  | 'CameraCalibrationSignature'
  | 'ProfileCalibrationSignature'
  | 'ProfileCalibrationSig'
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
