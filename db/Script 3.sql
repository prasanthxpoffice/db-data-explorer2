USE [IAS]
GO
/****** Object:  StoredProcedure [graphdb].[sp_NodesGenerate]    Script Date: 11/19/2025 7:37:09 AM ******/
DROP PROCEDURE [graphdb].[sp_NodesGenerate]
GO
/****** Object:  StoredProcedure [graphdb].[api_ViewsGet]    Script Date: 11/19/2025 7:37:09 AM ******/
DROP PROCEDURE [graphdb].[api_ViewsGet]
GO
/****** Object:  StoredProcedure [graphdb].[api_ViewColumnItemsGet]    Script Date: 11/19/2025 7:37:09 AM ******/
DROP PROCEDURE [graphdb].[api_ViewColumnItemsGet]
GO
/****** Object:  StoredProcedure [graphdb].[api_RelationsGet]    Script Date: 11/19/2025 7:37:09 AM ******/
DROP PROCEDURE [graphdb].[api_RelationsGet]
GO
/****** Object:  StoredProcedure [graphdb].[api_RelationSave]    Script Date: 11/19/2025 7:37:09 AM ******/
DROP PROCEDURE [graphdb].[api_RelationSave]
GO
/****** Object:  StoredProcedure [graphdb].[api_RelationDelete]    Script Date: 11/19/2025 7:37:09 AM ******/
DROP PROCEDURE [graphdb].[api_RelationDelete]
GO
/****** Object:  StoredProcedure [graphdb].[api_NodeUpdate]    Script Date: 11/19/2025 7:37:09 AM ******/
DROP PROCEDURE [graphdb].[api_NodeUpdate]
GO
/****** Object:  StoredProcedure [graphdb].[api_NodeTypesGet]    Script Date: 11/19/2025 7:37:09 AM ******/
DROP PROCEDURE [graphdb].[api_NodeTypesGet]
GO
/****** Object:  StoredProcedure [graphdb].[api_NodesGet]    Script Date: 11/19/2025 7:37:09 AM ******/
DROP PROCEDURE [graphdb].[api_NodesGet]
GO
/****** Object:  StoredProcedure [graphdb].[api_NodeLegendsGet]    Script Date: 11/19/2025 7:37:09 AM ******/
DROP PROCEDURE [graphdb].[api_NodeLegendsGet]
GO
/****** Object:  StoredProcedure [graphdb].[api_NodeExpand_backup]    Script Date: 11/19/2025 7:37:09 AM ******/
DROP PROCEDURE [graphdb].[api_NodeExpand_backup]
GO
/****** Object:  StoredProcedure [graphdb].[api_NodeExpand]    Script Date: 11/19/2025 7:37:09 AM ******/
DROP PROCEDURE [graphdb].[api_NodeExpand]
GO
/****** Object:  StoredProcedure [graphdb].[api_Expand]    Script Date: 11/19/2025 7:37:09 AM ******/
DROP PROCEDURE [graphdb].[api_Expand]
GO
ALTER TABLE [graphdb].[Nodes] DROP CONSTRAINT [FK_Nodes_GroupNode]
GO
ALTER TABLE [graphdb].[Nodes] DROP CONSTRAINT [DF_Nodes_ColumnColor]
GO
ALTER TABLE [graphdb].[Nodes] DROP CONSTRAINT [DF_SeedCol_IsActive]
GO
/****** Object:  Index [UQ_Relations_Source_Search_Display]    Script Date: 11/19/2025 7:37:09 AM ******/
ALTER TABLE [graphdb].[Relations] DROP CONSTRAINT [UQ_Relations_Source_Search_Display]
GO
/****** Object:  Table [graphdb].[ViewRegistry]    Script Date: 11/19/2025 7:37:09 AM ******/
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[graphdb].[ViewRegistry]') AND type in (N'U'))
DROP TABLE [graphdb].[ViewRegistry]
GO
/****** Object:  Table [graphdb].[RelationsData]    Script Date: 11/19/2025 7:37:09 AM ******/
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[graphdb].[RelationsData]') AND type in (N'U'))
DROP TABLE [graphdb].[RelationsData]
GO
/****** Object:  Table [graphdb].[Relations]    Script Date: 11/19/2025 7:37:09 AM ******/
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[graphdb].[Relations]') AND type in (N'U'))
DROP TABLE [graphdb].[Relations]
GO
/****** Object:  Table [graphdb].[Nodes]    Script Date: 11/19/2025 7:37:09 AM ******/
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[graphdb].[Nodes]') AND type in (N'U'))
DROP TABLE [graphdb].[Nodes]
GO
/****** Object:  Table [graphdb].[IncidentsData]    Script Date: 11/19/2025 7:37:09 AM ******/
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[graphdb].[IncidentsData]') AND type in (N'U'))
DROP TABLE [graphdb].[IncidentsData]
GO
/****** Object:  Table [graphdb].[GroupNode]    Script Date: 11/19/2025 7:37:09 AM ******/
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[graphdb].[GroupNode]') AND type in (N'U'))
DROP TABLE [graphdb].[GroupNode]
GO
/****** Object:  UserDefinedTableType [graphdb].[IntList]    Script Date: 11/19/2025 7:37:09 AM ******/
DROP TYPE [graphdb].[IntList]
GO
/****** Object:  UserDefinedTableType [graphdb].[ExpandDateFilter]    Script Date: 11/19/2025 7:37:09 AM ******/
DROP TYPE [graphdb].[ExpandDateFilter]
GO
/****** Object:  Schema [graphdb]    Script Date: 11/19/2025 7:37:09 AM ******/
DROP SCHEMA [graphdb]
GO
/****** Object:  Schema [graphdb]    Script Date: 11/19/2025 7:37:09 AM ******/
CREATE SCHEMA [graphdb]
GO
/****** Object:  UserDefinedTableType [graphdb].[ExpandDateFilter]    Script Date: 11/19/2025 7:37:09 AM ******/
CREATE TYPE [graphdb].[ExpandDateFilter] AS TABLE(
	[DestinationColId] [sysname] NOT NULL,
	[FromDate] [date] NULL,
	[ToDate] [date] NULL,
	PRIMARY KEY CLUSTERED 
(
	[DestinationColId] ASC
)WITH (IGNORE_DUP_KEY = OFF)
)
GO
/****** Object:  UserDefinedTableType [graphdb].[IntList]    Script Date: 11/19/2025 7:37:09 AM ******/
CREATE TYPE [graphdb].[IntList] AS TABLE(
	[ViewID] [int] NOT NULL,
	PRIMARY KEY CLUSTERED 
(
	[ViewID] ASC
)WITH (IGNORE_DUP_KEY = OFF)
)
GO
/****** Object:  Table [graphdb].[GroupNode]    Script Date: 11/19/2025 7:37:09 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [graphdb].[GroupNode](
	[GroupNodeID] [int] NOT NULL,
	[GroupNodeTag] [nvarchar](10) NOT NULL,
	[GroupNodeEn] [nvarchar](200) NOT NULL,
	[GroupNodeAr] [nvarchar](200) NOT NULL,
 CONSTRAINT [PK_GroupNode] PRIMARY KEY CLUSTERED 
(
	[GroupNodeID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [graphdb].[IncidentsData]    Script Date: 11/19/2025 7:37:09 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [graphdb].[IncidentsData](
	[NT_A_NT] [varchar](50) NULL,
	[ED_A_ED] [varchar](50) NULL,
	[DATE_A_DATE] [date] NULL,
	[ID_A_ID] [int] NULL,
	[TEXT_A_TEXT] [varchar](100) NULL,
	[COLOR_A_COLOR] [varchar](20) NULL,
	[NT_B_NT] [varchar](50) NULL,
	[ED_B_ED] [varchar](50) NULL,
	[DATE_B_DATE] [date] NULL,
	[ID_B_ID] [int] NULL,
	[TEXT_B_TEXT] [varchar](100) NULL,
	[COLOR_B_COLOR] [varchar](20) NULL,
	[NT_C_NT] [varchar](50) NULL,
	[ED_C_ED] [varchar](50) NULL,
	[DATE_C_DATE] [date] NULL,
	[ID_C_ID] [int] NULL,
	[TEXT_C_TEXT] [varchar](100) NULL,
	[COLOR_C_COLOR] [varchar](20) NULL,
	[NT_D_NT] [varchar](50) NULL,
	[ED_D_ED] [varchar](50) NULL,
	[DATE_D_DATE] [date] NULL,
	[ID_D_ID] [int] NULL,
	[TEXT_D_TEXT] [varchar](100) NULL,
	[COLOR_D_COLOR] [varchar](20) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [graphdb].[Nodes]    Script Date: 11/19/2025 7:37:09 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [graphdb].[Nodes](
	[Column_ID] [sysname] NOT NULL,
	[GroupNodeID] [int] NULL,
	[ColumnEn] [nvarchar](200) NULL,
	[ColumnAr] [nvarchar](200) NULL,
	[IsActive] [bit] NOT NULL,
	[ColumnColor] [nvarchar](20) NOT NULL,
 CONSTRAINT [PK_SeedColumnCatalog] PRIMARY KEY CLUSTERED 
(
	[Column_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [graphdb].[Relations]    Script Date: 11/19/2025 7:37:09 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [graphdb].[Relations](
	[Source_Column_ID] [nvarchar](128) NOT NULL,
	[Search_Column_ID] [nvarchar](128) NOT NULL,
	[Display_Column_ID] [nvarchar](128) NOT NULL,
	[Direction] [nchar](10) NULL,
	[Relation_Column_ID] [nvarchar](128) NULL,
	[RelationEn] [nvarchar](128) NULL,
	[RelationAr] [nvarchar](128) NULL,
	[RelationID] [int] IDENTITY(1,1) NOT NULL,
 CONSTRAINT [PK_Relations] PRIMARY KEY CLUSTERED 
(
	[Source_Column_ID] ASC,
	[Search_Column_ID] ASC,
	[Display_Column_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [graphdb].[RelationsData]    Script Date: 11/19/2025 7:37:09 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [graphdb].[RelationsData](
	[NT_B_NT] [varchar](50) NULL,
	[ED_B_ED] [varchar](50) NULL,
	[DATE_B_DATE] [date] NULL,
	[ID_B_ID] [int] NULL,
	[TEXT_B_TEXT] [varchar](100) NULL,
	[COLOR_B_COLOR] [varchar](20) NULL,
	[NT_R_NT] [varchar](50) NULL,
	[ED_R_ED] [varchar](50) NULL,
	[DATE_R_DATE] [date] NULL,
	[ID_R_ID] [int] NULL,
	[TEXT_R_TEXT] [varchar](100) NULL,
	[COLOR_R_COLOR] [varchar](20) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [graphdb].[ViewRegistry]    Script Date: 11/19/2025 7:37:09 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [graphdb].[ViewRegistry](
	[ViewID] [int] IDENTITY(1,1) NOT NULL,
	[ViewDescriptionEn] [nvarchar](200) NOT NULL,
	[ViewDescriptionAr] [nvarchar](200) NOT NULL,
	[ViewNameEn] [nvarchar](128) NOT NULL,
	[ViewNameAr] [nvarchar](128) NOT NULL,
	[ViewDB] [nvarchar](128) NOT NULL,
	[ViewSchema] [nvarchar](128) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[ViewID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
INSERT [graphdb].[GroupNode] ([GroupNodeID], [GroupNodeTag], [GroupNodeEn], [GroupNodeAr]) VALUES (1, N'GN_1', N'Incident', N'حادثة')
GO
INSERT [graphdb].[GroupNode] ([GroupNodeID], [GroupNodeTag], [GroupNodeEn], [GroupNodeAr]) VALUES (2, N'GN_2', N'Vehicle', N'عربة')
GO
INSERT [graphdb].[GroupNode] ([GroupNodeID], [GroupNodeTag], [GroupNodeEn], [GroupNodeAr]) VALUES (3, N'GN_3', N'Person', N'شخص')
GO
INSERT [graphdb].[GroupNode] ([GroupNodeID], [GroupNodeTag], [GroupNodeEn], [GroupNodeAr]) VALUES (4, N'GN_4', N'Weapon', N'سلاح')
GO
INSERT [graphdb].[IncidentsData] ([NT_A_NT], [ED_A_ED], [DATE_A_DATE], [ID_A_ID], [TEXT_A_TEXT], [COLOR_A_COLOR], [NT_B_NT], [ED_B_ED], [DATE_B_DATE], [ID_B_ID], [TEXT_B_TEXT], [COLOR_B_COLOR], [NT_C_NT], [ED_C_ED], [DATE_C_DATE], [ID_C_ID], [TEXT_C_TEXT], [COLOR_C_COLOR], [NT_D_NT], [ED_D_ED], [DATE_D_DATE], [ID_D_ID], [TEXT_D_TEXT], [COLOR_D_COLOR]) VALUES (N'Incident', N'Incident', CAST(N'2025-11-14' AS Date), 1, N'Incident 1', N'#0000FF', N'Person', N'Character', CAST(N'1900-01-01' AS Date), 1, N'Person 1', N'#008080', NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL, NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL)
GO
INSERT [graphdb].[IncidentsData] ([NT_A_NT], [ED_A_ED], [DATE_A_DATE], [ID_A_ID], [TEXT_A_TEXT], [COLOR_A_COLOR], [NT_B_NT], [ED_B_ED], [DATE_B_DATE], [ID_B_ID], [TEXT_B_TEXT], [COLOR_B_COLOR], [NT_C_NT], [ED_C_ED], [DATE_C_DATE], [ID_C_ID], [TEXT_C_TEXT], [COLOR_C_COLOR], [NT_D_NT], [ED_D_ED], [DATE_D_DATE], [ID_D_ID], [TEXT_D_TEXT], [COLOR_D_COLOR]) VALUES (N'Incident', N'Incident', CAST(N'2025-11-14' AS Date), 1, N'Incident 1', N'#0000FF', N'Person', N'Character', CAST(N'1900-01-01' AS Date), 2, N'Person 2', N'#FFA500', NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL, NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL)
GO
INSERT [graphdb].[IncidentsData] ([NT_A_NT], [ED_A_ED], [DATE_A_DATE], [ID_A_ID], [TEXT_A_TEXT], [COLOR_A_COLOR], [NT_B_NT], [ED_B_ED], [DATE_B_DATE], [ID_B_ID], [TEXT_B_TEXT], [COLOR_B_COLOR], [NT_C_NT], [ED_C_ED], [DATE_C_DATE], [ID_C_ID], [TEXT_C_TEXT], [COLOR_C_COLOR], [NT_D_NT], [ED_D_ED], [DATE_D_DATE], [ID_D_ID], [TEXT_D_TEXT], [COLOR_D_COLOR]) VALUES (N'Incident', N'Incident', CAST(N'2025-11-14' AS Date), 1, N'Incident 1', N'#0000FF', N'Person', N'Character', CAST(N'1900-01-01' AS Date), 3, N'Person 3', N'#008080', NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL, NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL)
GO
INSERT [graphdb].[IncidentsData] ([NT_A_NT], [ED_A_ED], [DATE_A_DATE], [ID_A_ID], [TEXT_A_TEXT], [COLOR_A_COLOR], [NT_B_NT], [ED_B_ED], [DATE_B_DATE], [ID_B_ID], [TEXT_B_TEXT], [COLOR_B_COLOR], [NT_C_NT], [ED_C_ED], [DATE_C_DATE], [ID_C_ID], [TEXT_C_TEXT], [COLOR_C_COLOR], [NT_D_NT], [ED_D_ED], [DATE_D_DATE], [ID_D_ID], [TEXT_D_TEXT], [COLOR_D_COLOR]) VALUES (N'Incident', N'Incident', CAST(N'2025-11-14' AS Date), 1, N'Incident 1', N'#0000FF', N'Person', N'Character', CAST(N'1900-01-01' AS Date), 4, N'Person 4', N'#FFA500', NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL, NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL)
GO
INSERT [graphdb].[IncidentsData] ([NT_A_NT], [ED_A_ED], [DATE_A_DATE], [ID_A_ID], [TEXT_A_TEXT], [COLOR_A_COLOR], [NT_B_NT], [ED_B_ED], [DATE_B_DATE], [ID_B_ID], [TEXT_B_TEXT], [COLOR_B_COLOR], [NT_C_NT], [ED_C_ED], [DATE_C_DATE], [ID_C_ID], [TEXT_C_TEXT], [COLOR_C_COLOR], [NT_D_NT], [ED_D_ED], [DATE_D_DATE], [ID_D_ID], [TEXT_D_TEXT], [COLOR_D_COLOR]) VALUES (N'Incident', N'Incident', CAST(N'2025-11-14' AS Date), 1, N'Incident 1', N'#0000FF', N'Person', N'Character', CAST(N'1900-01-01' AS Date), 5, N'Person 5', N'#00FFFF', NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL, NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL)
GO
INSERT [graphdb].[IncidentsData] ([NT_A_NT], [ED_A_ED], [DATE_A_DATE], [ID_A_ID], [TEXT_A_TEXT], [COLOR_A_COLOR], [NT_B_NT], [ED_B_ED], [DATE_B_DATE], [ID_B_ID], [TEXT_B_TEXT], [COLOR_B_COLOR], [NT_C_NT], [ED_C_ED], [DATE_C_DATE], [ID_C_ID], [TEXT_C_TEXT], [COLOR_C_COLOR], [NT_D_NT], [ED_D_ED], [DATE_D_DATE], [ID_D_ID], [TEXT_D_TEXT], [COLOR_D_COLOR]) VALUES (N'Incident', N'Incident', CAST(N'1900-01-01' AS Date), 2, N'Incident 2', N'#0000FF', N'Person', N'Character', CAST(N'1900-01-01' AS Date), 1, N'Person 1', N'#008080', NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL, NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL)
GO
INSERT [graphdb].[IncidentsData] ([NT_A_NT], [ED_A_ED], [DATE_A_DATE], [ID_A_ID], [TEXT_A_TEXT], [COLOR_A_COLOR], [NT_B_NT], [ED_B_ED], [DATE_B_DATE], [ID_B_ID], [TEXT_B_TEXT], [COLOR_B_COLOR], [NT_C_NT], [ED_C_ED], [DATE_C_DATE], [ID_C_ID], [TEXT_C_TEXT], [COLOR_C_COLOR], [NT_D_NT], [ED_D_ED], [DATE_D_DATE], [ID_D_ID], [TEXT_D_TEXT], [COLOR_D_COLOR]) VALUES (N'Incident', N'Incident', CAST(N'1900-01-01' AS Date), 2, N'Incident 2', N'#0000FF', N'Person', N'Character', CAST(N'1900-01-01' AS Date), 6, N'Person 6', N'#FFA500', NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL, NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL)
GO
INSERT [graphdb].[IncidentsData] ([NT_A_NT], [ED_A_ED], [DATE_A_DATE], [ID_A_ID], [TEXT_A_TEXT], [COLOR_A_COLOR], [NT_B_NT], [ED_B_ED], [DATE_B_DATE], [ID_B_ID], [TEXT_B_TEXT], [COLOR_B_COLOR], [NT_C_NT], [ED_C_ED], [DATE_C_DATE], [ID_C_ID], [TEXT_C_TEXT], [COLOR_C_COLOR], [NT_D_NT], [ED_D_ED], [DATE_D_DATE], [ID_D_ID], [TEXT_D_TEXT], [COLOR_D_COLOR]) VALUES (N'Incident', N'Incident', CAST(N'1900-01-01' AS Date), 2, N'Incident 2', N'#0000FF', N'Person', N'Character', CAST(N'1900-01-01' AS Date), 3, N'Person 3', N'#008080', NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL, NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL)
GO
INSERT [graphdb].[IncidentsData] ([NT_A_NT], [ED_A_ED], [DATE_A_DATE], [ID_A_ID], [TEXT_A_TEXT], [COLOR_A_COLOR], [NT_B_NT], [ED_B_ED], [DATE_B_DATE], [ID_B_ID], [TEXT_B_TEXT], [COLOR_B_COLOR], [NT_C_NT], [ED_C_ED], [DATE_C_DATE], [ID_C_ID], [TEXT_C_TEXT], [COLOR_C_COLOR], [NT_D_NT], [ED_D_ED], [DATE_D_DATE], [ID_D_ID], [TEXT_D_TEXT], [COLOR_D_COLOR]) VALUES (N'Incident', N'Incident', CAST(N'1900-01-01' AS Date), 2, N'Incident 2', N'#0000FF', NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL, N'Vehicle', N'Car', CAST(N'1900-01-01' AS Date), 11, N'Rav 4', N'#FFFF00', NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL)
GO
INSERT [graphdb].[IncidentsData] ([NT_A_NT], [ED_A_ED], [DATE_A_DATE], [ID_A_ID], [TEXT_A_TEXT], [COLOR_A_COLOR], [NT_B_NT], [ED_B_ED], [DATE_B_DATE], [ID_B_ID], [TEXT_B_TEXT], [COLOR_B_COLOR], [NT_C_NT], [ED_C_ED], [DATE_C_DATE], [ID_C_ID], [TEXT_C_TEXT], [COLOR_C_COLOR], [NT_D_NT], [ED_D_ED], [DATE_D_DATE], [ID_D_ID], [TEXT_D_TEXT], [COLOR_D_COLOR]) VALUES (N'Incident', N'Incident', CAST(N'2025-11-14' AS Date), 1, N'Incident 1', N'#0000FF', NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL, N'Vehicle', N'Car', CAST(N'1900-01-01' AS Date), 12, N'Yaris', N'#FFFF00', NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL)
GO
INSERT [graphdb].[IncidentsData] ([NT_A_NT], [ED_A_ED], [DATE_A_DATE], [ID_A_ID], [TEXT_A_TEXT], [COLOR_A_COLOR], [NT_B_NT], [ED_B_ED], [DATE_B_DATE], [ID_B_ID], [TEXT_B_TEXT], [COLOR_B_COLOR], [NT_C_NT], [ED_C_ED], [DATE_C_DATE], [ID_C_ID], [TEXT_C_TEXT], [COLOR_C_COLOR], [NT_D_NT], [ED_D_ED], [DATE_D_DATE], [ID_D_ID], [TEXT_D_TEXT], [COLOR_D_COLOR]) VALUES (N'Incident', N'Incident', CAST(N'1900-01-01' AS Date), 2, N'Incident 2', N'#0000FF', NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL, N'Vehicle', N'Car', CAST(N'1900-01-01' AS Date), 13, N'BYD', N'#FFFF00', NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL)
GO
INSERT [graphdb].[IncidentsData] ([NT_A_NT], [ED_A_ED], [DATE_A_DATE], [ID_A_ID], [TEXT_A_TEXT], [COLOR_A_COLOR], [NT_B_NT], [ED_B_ED], [DATE_B_DATE], [ID_B_ID], [TEXT_B_TEXT], [COLOR_B_COLOR], [NT_C_NT], [ED_C_ED], [DATE_C_DATE], [ID_C_ID], [TEXT_C_TEXT], [COLOR_C_COLOR], [NT_D_NT], [ED_D_ED], [DATE_D_DATE], [ID_D_ID], [TEXT_D_TEXT], [COLOR_D_COLOR]) VALUES (N'Incident', N'Incident', CAST(N'2025-11-14' AS Date), 1, N'Incident 1', N'#0000FF', NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL, NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL, N'Weapon', N'Weapon', CAST(N'1900-01-01' AS Date), 1, N'Weapon 1', N'#00FFFF')
GO
INSERT [graphdb].[IncidentsData] ([NT_A_NT], [ED_A_ED], [DATE_A_DATE], [ID_A_ID], [TEXT_A_TEXT], [COLOR_A_COLOR], [NT_B_NT], [ED_B_ED], [DATE_B_DATE], [ID_B_ID], [TEXT_B_TEXT], [COLOR_B_COLOR], [NT_C_NT], [ED_C_ED], [DATE_C_DATE], [ID_C_ID], [TEXT_C_TEXT], [COLOR_C_COLOR], [NT_D_NT], [ED_D_ED], [DATE_D_DATE], [ID_D_ID], [TEXT_D_TEXT], [COLOR_D_COLOR]) VALUES (N'Incident', N'Incident', CAST(N'1900-01-01' AS Date), 2, N'Incident 2', N'#0000FF', NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL, NULL, NULL, CAST(N'1900-01-01' AS Date), NULL, NULL, NULL, N'Weapon', N'Weapon', CAST(N'1900-01-01' AS Date), 2, N'Weapon 2', N'#00FFFF')
GO
INSERT [graphdb].[Nodes] ([Column_ID], [GroupNodeID], [ColumnEn], [ColumnAr], [IsActive], [ColumnColor]) VALUES (N'ID_A_ID', 1, N'Incident', N'حادثة', 1, N'#b8b8ff')
GO
INSERT [graphdb].[Nodes] ([Column_ID], [GroupNodeID], [ColumnEn], [ColumnAr], [IsActive], [ColumnColor]) VALUES (N'ID_B_ID', 3, N'Person', N'شخص', 1, N'#85ffb4')
GO
INSERT [graphdb].[Nodes] ([Column_ID], [GroupNodeID], [ColumnEn], [ColumnAr], [IsActive], [ColumnColor]) VALUES (N'ID_C_ID', 2, N'Vehicle', N'عربة', 1, N'#ffffc2')
GO
INSERT [graphdb].[Nodes] ([Column_ID], [GroupNodeID], [ColumnEn], [ColumnAr], [IsActive], [ColumnColor]) VALUES (N'ID_D_ID', 4, N'Weapon', N'سلاح', 1, N'#b3ffff')
GO
INSERT [graphdb].[Nodes] ([Column_ID], [GroupNodeID], [ColumnEn], [ColumnAr], [IsActive], [ColumnColor]) VALUES (N'ID_R_ID', 3, N'Relation', N'العلاقة', 1, N'#ffb8ff')
GO
SET IDENTITY_INSERT [graphdb].[Relations] ON 
GO
INSERT [graphdb].[Relations] ([Source_Column_ID], [Search_Column_ID], [Display_Column_ID], [Direction], [Relation_Column_ID], [RelationEn], [RelationAr], [RelationID]) VALUES (N'ID_A_ID', N'ID_A_ID', N'ID_B_ID', N'->        ', NULL, N'Person Involved', N'الشخص المعني', 1)
GO
INSERT [graphdb].[Relations] ([Source_Column_ID], [Search_Column_ID], [Display_Column_ID], [Direction], [Relation_Column_ID], [RelationEn], [RelationAr], [RelationID]) VALUES (N'ID_A_ID', N'ID_A_ID', N'ID_C_ID', N'->        ', NULL, N'Vehicle Used', N'مركبة مستعملة', 2)
GO
INSERT [graphdb].[Relations] ([Source_Column_ID], [Search_Column_ID], [Display_Column_ID], [Direction], [Relation_Column_ID], [RelationEn], [RelationAr], [RelationID]) VALUES (N'ID_A_ID', N'ID_A_ID', N'ID_D_ID', N'->        ', NULL, N'Weapon Used', N'السلاح المستخدم', 3)
GO
INSERT [graphdb].[Relations] ([Source_Column_ID], [Search_Column_ID], [Display_Column_ID], [Direction], [Relation_Column_ID], [RelationEn], [RelationAr], [RelationID]) VALUES (N'ID_B_ID', N'ID_B_ID', N'ID_A_ID', N'->        ', NULL, N'Incident', N'حادثة', 4)
GO
INSERT [graphdb].[Relations] ([Source_Column_ID], [Search_Column_ID], [Display_Column_ID], [Direction], [Relation_Column_ID], [RelationEn], [RelationAr], [RelationID]) VALUES (N'ID_B_ID', N'ID_B_ID', N'ID_R_ID', N'->        ', N'ID_R_ID', NULL, NULL, 5)
GO
INSERT [graphdb].[Relations] ([Source_Column_ID], [Search_Column_ID], [Display_Column_ID], [Direction], [Relation_Column_ID], [RelationEn], [RelationAr], [RelationID]) VALUES (N'ID_R_ID', N'ID_B_ID', N'ID_A_ID', N'->        ', NULL, N'Incident', N'حادثة', 6)
GO
SET IDENTITY_INSERT [graphdb].[Relations] OFF
GO
INSERT [graphdb].[RelationsData] ([NT_B_NT], [ED_B_ED], [DATE_B_DATE], [ID_B_ID], [TEXT_B_TEXT], [COLOR_B_COLOR], [NT_R_NT], [ED_R_ED], [DATE_R_DATE], [ID_R_ID], [TEXT_R_TEXT], [COLOR_R_COLOR]) VALUES (N'Person', N'Character', CAST(N'1900-01-01' AS Date), 1, N'Person 1', N'#008080', N'Relation', N'Brother', CAST(N'1900-01-01' AS Date), 2, N'Person 2', N'#008080')
GO
INSERT [graphdb].[RelationsData] ([NT_B_NT], [ED_B_ED], [DATE_B_DATE], [ID_B_ID], [TEXT_B_TEXT], [COLOR_B_COLOR], [NT_R_NT], [ED_R_ED], [DATE_R_DATE], [ID_R_ID], [TEXT_R_TEXT], [COLOR_R_COLOR]) VALUES (N'Person', N'Character', CAST(N'1900-01-01' AS Date), 1, N'Person 1', N'#008080', N'Relation', N'Sister', CAST(N'1900-01-01' AS Date), 3, N'Person 3', N'#008080')
GO
INSERT [graphdb].[RelationsData] ([NT_B_NT], [ED_B_ED], [DATE_B_DATE], [ID_B_ID], [TEXT_B_TEXT], [COLOR_B_COLOR], [NT_R_NT], [ED_R_ED], [DATE_R_DATE], [ID_R_ID], [TEXT_R_TEXT], [COLOR_R_COLOR]) VALUES (N'Person', N'Character', CAST(N'1900-01-01' AS Date), 4, N'Person 4', N'#008080', N'Relation', N'Father', CAST(N'1900-01-01' AS Date), 5, N'Person 5', N'#008080')
GO
SET IDENTITY_INSERT [graphdb].[ViewRegistry] ON 
GO
INSERT [graphdb].[ViewRegistry] ([ViewID], [ViewDescriptionEn], [ViewDescriptionAr], [ViewNameEn], [ViewNameAr], [ViewDB], [ViewSchema]) VALUES (1, N'Incidents En', N'Incidents Ar', N'IncidentsData', N'IncidentsData', N'IAS', N'graphdb')
GO
INSERT [graphdb].[ViewRegistry] ([ViewID], [ViewDescriptionEn], [ViewDescriptionAr], [ViewNameEn], [ViewNameAr], [ViewDB], [ViewSchema]) VALUES (2, N'Relations En', N'Relations Ar', N'RelationsData', N'RelationsData', N'IAS', N'graphdb')
GO
SET IDENTITY_INSERT [graphdb].[ViewRegistry] OFF
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ_Relations_Source_Search_Display]    Script Date: 11/19/2025 7:37:09 AM ******/
ALTER TABLE [graphdb].[Relations] ADD  CONSTRAINT [UQ_Relations_Source_Search_Display] UNIQUE NONCLUSTERED 
(
	[Source_Column_ID] ASC,
	[Search_Column_ID] ASC,
	[Display_Column_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [graphdb].[Nodes] ADD  CONSTRAINT [DF_SeedCol_IsActive]  DEFAULT ((0)) FOR [IsActive]
GO
ALTER TABLE [graphdb].[Nodes] ADD  CONSTRAINT [DF_Nodes_ColumnColor]  DEFAULT (N'#b3ffff') FOR [ColumnColor]
GO
ALTER TABLE [graphdb].[Nodes]  WITH CHECK ADD  CONSTRAINT [FK_Nodes_GroupNode] FOREIGN KEY([GroupNodeID])
REFERENCES [graphdb].[GroupNode] ([GroupNodeID])
GO
ALTER TABLE [graphdb].[Nodes] CHECK CONSTRAINT [FK_Nodes_GroupNode]
GO
/****** Object:  StoredProcedure [graphdb].[api_Expand]    Script Date: 11/19/2025 7:37:09 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE  PROCEDURE [graphdb].[api_Expand]
  @Lang        nvarchar(2),                     -- 'en' | 'ar'
  @ViewIds     graphdb.IntList READONLY,        -- selected view IDs
  @SourceColId sysname,                         -- e.g., 'ID_B_ID'
  @SourceId    nvarchar(4000),                  -- ALWAYS string; cast per table
  @Filters     graphdb.ExpandDateFilter READONLY,  -- per-destination filters
  @MaxNodes    int
AS
BEGIN
  SET NOCOUNT ON;

  /* 1) Relation rules (localized) for this source */
  SELECT
      Source_Column_ID,
      Search_Column_ID,
      Display_Column_ID,
      Relation_Column_ID,
      Direction,
      CASE WHEN @Lang='ar' THEN RelationAr ELSE RelationEn END AS EdgeLabel
  INTO #R
  FROM graphdb.Relations
  WHERE Source_Column_ID = @SourceColId;

  IF NOT EXISTS (SELECT 1 FROM #R) RETURN;

  /* 2) Output accumulator + echo the source context */
  CREATE TABLE #Out (
    sourceColId sysname        NOT NULL,
    sourceId    nvarchar(256)  NOT NULL,
    displayCol  sysname        NOT NULL,
    edgeLabel   nvarchar(200)  NULL,
    ed_r_ed     nvarchar(200)  NULL,
    id          nvarchar(256)  NOT NULL,
    [text]      nvarchar(400)  NULL,
    [direction] nchar(10)      NULL,
    ed          nvarchar(100)  NULL,
    nodeDate    date           NULL
  );

  DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
    SELECT Search_Column_ID, Display_Column_ID, Relation_Column_ID, Direction, EdgeLabel
    FROM #R;

  DECLARE
    @SearchCol   sysname,
    @DisplayCol  sysname,
    @RelCol      sysname,
    @Direction   nchar(10),
    @EdgeLabel   nvarchar(200);

  OPEN cur;
  FETCH NEXT FROM cur INTO @SearchCol, @DisplayCol, @RelCol, @Direction, @EdgeLabel;

  WHILE @@FETCH_STATUS = 0
  BEGIN
    -- TARGET side column names
    DECLARE @TextCol      sysname = REPLACE(REPLACE(@DisplayCol,'ID_','TEXT_'),'_ID','_TEXT');
    DECLARE @NodeDateCol  sysname = REPLACE(REPLACE(@DisplayCol,'ID_','DATE_'),'_ID','_DATE');
    DECLARE @EdCol        sysname = REPLACE(REPLACE(@DisplayCol,'ID_','ED_'  ),'_ID','_ED'  );

    -- Per-destination date range (optional)
    DECLARE @F date = NULL, @T date = NULL, @HasDates bit = 0;
    SELECT @F = f.FromDate, @T = f.ToDate
    FROM @Filters f
    WHERE f.DestinationColId = @DisplayCol;

    IF (@F IS NOT NULL AND @T IS NOT NULL) SET @HasDates = 1;

    ;WITH V AS (
      SELECT
        v.ViewDB,
        v.ViewSchema,
        CASE WHEN @Lang = N'ar' THEN v.ViewNameAr ELSE v.ViewNameEn END AS ViewName,
        OBJECT_ID(QUOTENAME(v.ViewDB)+'.'+QUOTENAME(v.ViewSchema)+'.'+QUOTENAME(
          CASE WHEN @Lang=N'ar' THEN v.ViewNameAr ELSE v.ViewNameEn END
        )) AS oid,
        QUOTENAME(v.ViewDB)+'.'+QUOTENAME(v.ViewSchema)+'.'+QUOTENAME(
          CASE WHEN @Lang=N'ar' THEN v.ViewNameAr ELSE v.ViewNameEn END
        ) AS fqname
      FROM graphdb.ViewRegistry v
      JOIN @ViewIds i ON i.ViewID = v.ViewID
    ),
    T AS (
      SELECT
        v.fqname,
        ty.name AS search_type,
        CASE WHEN cED.column_id IS NULL THEN 0 ELSE 1 END AS hasEd,
        CASE WHEN cND.column_id IS NULL THEN 0 ELSE 1 END AS hasNodeDate
      FROM V v
      JOIN sys.columns c1  ON c1.object_id = v.oid AND c1.name = @SearchCol   -- must exist
      JOIN sys.columns c2  ON c2.object_id = v.oid AND c2.name = @DisplayCol   -- must exist
      JOIN sys.types   ty  ON ty.user_type_id = c1.user_type_id
      LEFT JOIN sys.columns cED ON cED.object_id = v.oid AND cED.name = @EdCol
      LEFT JOIN sys.columns cND ON cND.object_id = v.oid AND cND.name = @NodeDateCol
    )
    SELECT fqname, search_type, hasEd, hasNodeDate
    INTO #T
    FROM T;  -- materialize

    DECLARE @sql nvarchar(max) = N'';

    /* Static literals for this relation row */
    DECLARE @edgeLit nvarchar(max) =
      CASE WHEN @EdgeLabel IS NULL THEN N'NULL'
           ELSE N'N''' + REPLACE(@EdgeLabel,'''','''''') + N''''
      END;

    DECLARE @dirLit nvarchar(max) =
      CASE WHEN @Direction IS NULL THEN N'NULL'
           ELSE N'N''' + REPLACE(RTRIM(@Direction),'''','''''') + N''''
      END;

    /* Build UNION ALL across eligible views */
    SELECT @sql = @sql +
      CASE WHEN @sql = N'' THEN N'' ELSE N' UNION ALL ' END +
      N'SELECT TOP('+CAST(@MaxNodes AS nvarchar(10))+N') '+
        N'N''' + @SourceColId + N''' AS sourceColId, ' +
        N'@Src AS sourceId, ' +
        N'N''' + @DisplayCol + N''' AS displayCol, '+
        @edgeLit + N' AS edgeLabel, '+
        CASE WHEN @DisplayCol = N'ID_R_ID' THEN N'ED_R_ED' ELSE N'NULL' END + N' AS ed_r_ed, '+
        N'CONVERT(nvarchar(256), '+QUOTENAME(@DisplayCol)+N') AS id, '+
        QUOTENAME(@TextCol)+N' AS [text], '+
        @dirLit + N' AS [direction], '+
        CASE WHEN hasEd=1 THEN QUOTENAME(@EdCol)             ELSE N'NULL' END + N' AS ed, '+
        CASE WHEN hasNodeDate=1 THEN QUOTENAME(@NodeDateCol) ELSE N'NULL' END + N' AS nodeDate '+
      N'FROM '+fqname+N' '+
      N'WHERE '+QUOTENAME(@SearchCol)+N' = CONVERT('+search_type+N', @Src) '+
      CASE WHEN @HasDates = 1 THEN N'AND '+QUOTENAME(@NodeDateCol)+N' BETWEEN @F AND @T ' ELSE N'' END +
      N'AND '+QUOTENAME(@DisplayCol)+N' IS NOT NULL'
    FROM #T
    WHERE (@HasDates = 0) OR (hasNodeDate = 1);  -- if we require dates, skip views without nodeDate

    IF @sql <> N''
    BEGIN
      INSERT #Out(sourceColId, sourceId, displayCol, edgeLabel, ed_r_ed, id, [text], [direction], ed, nodeDate)
      EXEC sp_executesql @sql,
        N'@Src nvarchar(4000), @F date, @T date',
        @Src=@SourceId, @F=@F, @T=@T;
    END

    DROP TABLE #T;

    FETCH NEXT FROM cur INTO @SearchCol, @DisplayCol, @RelCol, @Direction, @EdgeLabel;
  END

  CLOSE cur; DEALLOCATE cur;

  /* 3) Final result: edge label fallback + color + localized nodeTypeLabel + source echo */
  SELECT
      o.sourceColId,
      o.sourceId,
      o.displayCol,
      COALESCE(NULLIF(o.edgeLabel, N''), o.ed_r_ed) AS edgeLabel,
      o.id,
      o.[text],
      o.ed_r_ed,
      o.[direction],
      o.ed,
      o.nodeDate,
      n.ColumnColor AS color,
      CASE WHEN @Lang='ar' THEN n.ColumnAr ELSE n.ColumnEn END AS nodeTypeLabel
  FROM #Out o
  LEFT JOIN graphdb.Nodes n
    ON n.Column_ID = o.displayCol
  GROUP BY
      o.sourceColId, o.sourceId,
      o.displayCol,
      COALESCE(NULLIF(o.edgeLabel, N''), o.ed_r_ed),
      o.id,
      o.[text],
      o.ed_r_ed,
      o.[direction],
      o.ed,
      o.nodeDate,
      n.ColumnColor,
      CASE WHEN @Lang='ar' THEN n.ColumnAr ELSE n.ColumnEn END

END
GO
/****** Object:  StoredProcedure [graphdb].[api_NodeExpand]    Script Date: 11/19/2025 7:37:09 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [graphdb].[api_NodeExpand]
  @Lang          nvarchar(2),                     -- 'en' | 'ar'
  @ViewIds       graphdb.IntList READONLY,        -- selected view IDs
  @SourceColId   sysname,                         -- legacy fallback, e.g. 'ID_B_ID'
  @SourceId      nvarchar(4000),                  -- ALWAYS string; cast per table
  @Filters       graphdb.ExpandDateFilter READONLY,  -- per-destination filters
  @MaxNodes      int,
  @GroupNodeID   int = NULL                       -- NEW: batch across grouped columns
AS
BEGIN
  SET NOCOUNT ON;

  -- Determine which source columns to process
  CREATE TABLE #Sources (Source_Column_ID sysname NOT NULL PRIMARY KEY);

  IF @GroupNodeID IS NOT NULL
  BEGIN
    INSERT INTO #Sources (Source_Column_ID)
    SELECT DISTINCT Column_ID
    FROM graphdb.Nodes
    WHERE GroupNodeID = @GroupNodeID;
  END

  -- Fallback if no group rows or @GroupNodeID NULL
  IF NOT EXISTS (SELECT 1 FROM #Sources)
  BEGIN
    INSERT INTO #Sources (Source_Column_ID)
    VALUES (@SourceColId);
  END

  -- Relation rules for all source columns in scope
  SELECT
      s.Source_Column_ID,
      r.Search_Column_ID,
      r.Display_Column_ID,
      r.Relation_Column_ID,
      r.Direction,
      CASE WHEN @Lang = N'ar' THEN r.RelationAr ELSE r.RelationEn END AS EdgeLabel
  INTO #R
  FROM #Sources s
  JOIN graphdb.Relations r
    ON r.Source_Column_ID = s.Source_Column_ID;

  IF NOT EXISTS (SELECT 1 FROM #R) RETURN;

  CREATE TABLE #Out (
    sourceColId sysname        NOT NULL,
    sourceId    nvarchar(256)  NOT NULL,
    displayCol  sysname        NOT NULL,
    edgeLabel   nvarchar(200)  NULL,
    ed_r_ed     nvarchar(200)  NULL,
    id          nvarchar(256)  NOT NULL,
    [text]      nvarchar(400)  NULL,
    [direction] nchar(10)      NULL,
    ed          nvarchar(100)  NULL,
    nodeDate    date           NULL
  );

  DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
    SELECT Source_Column_ID, Search_Column_ID, Display_Column_ID, Relation_Column_ID, Direction, EdgeLabel
    FROM #R;

  DECLARE
    @SourceCol   sysname,
    @SearchCol   sysname,
    @DisplayCol  sysname,
    @RelCol      sysname,
    @Direction   nchar(10),
    @EdgeLabel   nvarchar(200);

  OPEN cur;
  FETCH NEXT FROM cur INTO @SourceCol, @SearchCol, @DisplayCol, @RelCol, @Direction, @EdgeLabel;

  WHILE @@FETCH_STATUS = 0
  BEGIN
    DECLARE @TextCol     sysname = REPLACE(REPLACE(@DisplayCol,'ID_','TEXT_'),'_ID','_TEXT');
    DECLARE @NodeDateCol sysname = REPLACE(REPLACE(@DisplayCol,'ID_','DATE_'),'_ID','_DATE');
    DECLARE @EdCol       sysname = REPLACE(REPLACE(@DisplayCol,'ID_','ED_'  ),'_ID','_ED'  );

    DECLARE @F date = NULL, @T date = NULL, @HasDates bit = 0;
    SELECT @F = f.FromDate, @T = f.ToDate
    FROM @Filters f
    WHERE f.DestinationColId = @DisplayCol;

    IF (@F IS NOT NULL AND @T IS NOT NULL) SET @HasDates = 1;

    ;WITH V AS (
      SELECT
        v.ViewDB,
        v.ViewSchema,
        CASE WHEN @Lang = N'ar' THEN v.ViewNameAr ELSE v.ViewNameEn END AS ViewName,
        OBJECT_ID(QUOTENAME(v.ViewDB)+'.'+QUOTENAME(v.ViewSchema)+'.'+QUOTENAME(
          CASE WHEN @Lang=N'ar' THEN v.ViewNameAr ELSE v.ViewNameEn END
        )) AS oid,
        QUOTENAME(v.ViewDB)+'.'+QUOTENAME(v.ViewSchema)+'.'+QUOTENAME(
          CASE WHEN @Lang=N'ar' THEN v.ViewNameAr ELSE v.ViewNameEn END
        ) AS fqname
      FROM graphdb.ViewRegistry v
      JOIN @ViewIds i ON i.ViewID = v.ViewID
    ),
    T AS (
      SELECT
        v.fqname,
        ty.name AS search_type,
        CASE WHEN cED.column_id IS NULL THEN 0 ELSE 1 END AS hasEd,
        CASE WHEN cND.column_id IS NULL THEN 0 ELSE 1 END AS hasNodeDate
      FROM V v
      JOIN sys.columns c1  ON c1.object_id = v.oid AND c1.name = @SearchCol
      JOIN sys.columns c2  ON c2.object_id = v.oid AND c2.name = @DisplayCol
      JOIN sys.types   ty  ON ty.user_type_id = c1.user_type_id
      LEFT JOIN sys.columns cED ON cED.object_id = v.oid AND cED.name = @EdCol
      LEFT JOIN sys.columns cND ON cND.object_id = v.oid AND cND.name = @NodeDateCol
    )
    SELECT fqname, search_type, hasEd, hasNodeDate
    INTO #T
    FROM T;

    DECLARE @sql nvarchar(max) = N'';

    DECLARE @edgeLit nvarchar(max) =
      CASE WHEN @EdgeLabel IS NULL THEN N'NULL'
           ELSE N'N''' + REPLACE(@EdgeLabel,'''','''''') + N''''
      END;

    DECLARE @dirLit nvarchar(max) =
      CASE WHEN @Direction IS NULL THEN N'NULL'
           ELSE N'N''' + REPLACE(RTRIM(@Direction),'''','''''') + N''''
      END;

    SELECT @sql = @sql +
      CASE WHEN @sql = N'' THEN N'' ELSE N' UNION ALL ' END +
      N'SELECT TOP('+CAST(@MaxNodes AS nvarchar(10))+N') '+
        N'N''' + @SourceCol + N''' AS sourceColId, ' +
        N'@Src AS sourceId, ' +
        N'N''' + @DisplayCol + N''' AS displayCol, '+
        @edgeLit + N' AS edgeLabel, '+
        CASE WHEN @DisplayCol = N'ID_R_ID' THEN N'ED_R_ED' ELSE N'NULL' END + N' AS ed_r_ed, '+
        N'CONVERT(nvarchar(256), '+QUOTENAME(@DisplayCol)+N') AS id, '+
        QUOTENAME(@TextCol)+N' AS [text], '+
        @dirLit + N' AS [direction], '+
        CASE WHEN hasEd=1 THEN QUOTENAME(@EdCol)             ELSE N'NULL' END + N' AS ed, '+
        CASE WHEN hasNodeDate=1 THEN QUOTENAME(@NodeDateCol) ELSE N'NULL' END + N' AS nodeDate '+
      N'FROM '+fqname+N' '+
      N'WHERE '+QUOTENAME(@SearchCol)+N' = CONVERT('+search_type+N', @Src) '+
      CASE WHEN @HasDates = 1 THEN N'AND '+QUOTENAME(@NodeDateCol)+N' BETWEEN @F AND @T ' ELSE N'' END +
      N'AND '+QUOTENAME(@DisplayCol)+N' IS NOT NULL'
    FROM #T
    WHERE (@HasDates = 0) OR (hasNodeDate = 1);

    IF @sql <> N''
    BEGIN
      INSERT #Out(sourceColId, sourceId, displayCol, edgeLabel, ed_r_ed, id, [text], [direction], ed, nodeDate)
      EXEC sp_executesql @sql,
        N'@Src nvarchar(4000), @F date, @T date',
        @Src=@SourceId, @F=@F, @T=@T;
    END

    DROP TABLE #T;

    FETCH NEXT FROM cur INTO @SourceCol, @SearchCol, @DisplayCol, @RelCol, @Direction, @EdgeLabel;
  END

  CLOSE cur; DEALLOCATE cur;

  SELECT
      o.sourceColId,
      o.sourceId,
      o.displayCol,
      COALESCE(NULLIF(o.edgeLabel, N''), o.ed_r_ed) AS edgeLabel,
      o.id,
      o.[text],
      o.ed_r_ed,
      o.[direction],
      o.ed,
      o.nodeDate,
      n.ColumnColor AS color,
      CASE WHEN @Lang='ar' THEN n.ColumnAr ELSE n.ColumnEn END AS nodeTypeLabel,
      n.GroupNodeID,
      g.GroupNodeTag,
      CASE WHEN @Lang='ar' THEN g.GroupNodeAr ELSE g.GroupNodeEn END AS groupNodeLabel
  FROM #Out o
  LEFT JOIN graphdb.Nodes n
    ON n.Column_ID = o.displayCol
  LEFT JOIN graphdb.GroupNode g
    ON g.GroupNodeID = n.GroupNodeID
  GROUP BY
      o.sourceColId, o.sourceId,
      o.displayCol,
      COALESCE(NULLIF(o.edgeLabel, N''), o.ed_r_ed),
      o.id,
      o.[text],
      o.ed_r_ed,
      o.[direction],
      o.ed,
      o.nodeDate,
      n.ColumnColor,
      CASE WHEN @Lang='ar' THEN n.ColumnAr ELSE n.ColumnEn END,
      n.GroupNodeID,
      g.GroupNodeTag,
      CASE WHEN @Lang='ar' THEN g.GroupNodeAr ELSE g.GroupNodeEn END;
END
GO
/****** Object:  StoredProcedure [graphdb].[api_NodeExpand_backup]    Script Date: 11/19/2025 7:37:09 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
create  PROCEDURE [graphdb].[api_NodeExpand_backup]
  @Lang        nvarchar(2),                 -- 'en' | 'ar'
  @ViewIds     graphdb.IntList READONLY,    -- selected view IDs
  @SourceColId sysname,                     -- e.g., 'ID_B_ID'
  @SourceId    nvarchar(4000),              -- ALWAYS string; cast per table
  @FromDate    date,
  @ToDate      date,
  @MaxNodes    int
AS
BEGIN
  SET NOCOUNT ON;

  /* 1) Relation rules (localized) for this source */
  SELECT
      Source_Column_ID,
      Search_Column_ID,
      Display_Column_ID,
      Relation_Column_ID,
      Direction,
      CASE WHEN @Lang='ar' THEN RelationAr ELSE RelationEn END AS EdgeLabel
  INTO #R
  FROM graphdb.Relations
  WHERE Source_Column_ID = @SourceColId;

  IF NOT EXISTS (SELECT 1 FROM #R) RETURN;

  /* 2) Output accumulator (NO NT column) */
  CREATE TABLE #Out (
    displayCol   sysname        NOT NULL,
    edgeLabel    nvarchar(200)  NULL,
    ed_r_ed      nvarchar(200)  NULL,
    id           nvarchar(256)  NOT NULL,
    [text]       nvarchar(400)  NULL,
    [direction]  nchar(10)      NULL,
    ed           nvarchar(100)  NULL,   -- ED_*_ED value for displayCol (if exists)
    nodeDate     date           NULL    -- DATE_*_DATE for displayCol (if exists)
  );

  DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
    SELECT Search_Column_ID, Display_Column_ID, Relation_Column_ID, Direction, EdgeLabel
    FROM #R;

  DECLARE
    @SearchCol sysname,
    @DisplayCol sysname,
    @RelCol sysname,
    @Direction nchar(10),
    @EdgeLabel nvarchar(200);

  OPEN cur;
  FETCH NEXT FROM cur INTO @SearchCol, @DisplayCol, @RelCol, @Direction, @EdgeLabel;

  WHILE @@FETCH_STATUS = 0
  BEGIN
    DECLARE @TextCol      sysname = REPLACE(REPLACE(@DisplayCol,'ID_','TEXT_'),'_ID','_TEXT');
    DECLARE @DateCol      sysname = REPLACE(REPLACE(@SearchCol ,'ID_','DATE_'),'_ID','_DATE'); -- filter column (by source)
    DECLARE @NodeDateCol  sysname = REPLACE(REPLACE(@DisplayCol,'ID_','DATE_'),'_ID','_DATE'); -- detail date (by target)
    DECLARE @EdCol        sysname = REPLACE(REPLACE(@DisplayCol,'ID_','ED_'  ),'_ID','_ED'  );

    ;WITH V AS (
      SELECT
        v.ViewDB,
        v.ViewSchema,
        CASE WHEN @Lang = N'ar' THEN v.ViewNameAr ELSE v.ViewNameEn END AS ViewName,
        OBJECT_ID(
          QUOTENAME(v.ViewDB)+'.'+QUOTENAME(v.ViewSchema)+'.'+QUOTENAME(
            CASE WHEN @Lang=N'ar' THEN v.ViewNameAr ELSE v.ViewNameEn END
          )
        ) AS oid,
        QUOTENAME(v.ViewDB)+'.'+QUOTENAME(v.ViewSchema)+'.'+QUOTENAME(
          CASE WHEN @Lang=N'ar' THEN v.ViewNameAr ELSE v.ViewNameEn END
        ) AS fqname
      FROM graphdb.ViewRegistry v
      JOIN @ViewIds i ON i.ViewID = v.ViewID
    ),
    T AS (
      SELECT
        v.fqname,
        ty.name AS search_type,
        CASE WHEN cED.column_id IS NULL THEN 0 ELSE 1 END AS hasEd,
        CASE WHEN cND.column_id IS NULL THEN 0 ELSE 1 END AS hasNodeDate
      FROM V v
      JOIN sys.columns c1  ON c1.object_id = v.oid AND c1.name = @SearchCol   -- must exist
      JOIN sys.columns c2  ON c2.object_id = v.oid AND c2.name = @DisplayCol   -- must exist
      JOIN sys.columns c3  ON c3.object_id = v.oid AND c3.name = @DateCol      -- must exist (filter)
      JOIN sys.types   ty  ON ty.user_type_id = c1.user_type_id
      LEFT JOIN sys.columns cED ON cED.object_id = v.oid AND cED.name = @EdCol
      LEFT JOIN sys.columns cND ON cND.object_id = v.oid AND cND.name = @NodeDateCol
    )
    SELECT fqname, search_type, hasEd, hasNodeDate
    INTO #T
    FROM T;  -- materialize

    DECLARE @sql nvarchar(max) = N'';

    /* Literals for static values per relation row */
    DECLARE @edgeLit nvarchar(max) =
      CASE WHEN @EdgeLabel IS NULL THEN N'NULL'
           ELSE N'N''' + REPLACE(@EdgeLabel,'''','''''') + N''''
      END;

    DECLARE @dirLit nvarchar(max) =
      CASE WHEN @Direction IS NULL THEN N'NULL'
           ELSE N'N''' + REPLACE(RTRIM(@Direction),'''','''''') + N''''
      END;

    /* Build UNION ALL across eligible views, projecting ed/nodeDate when available */
    SELECT @sql = @sql +
      CASE WHEN @sql = N'' THEN N'' ELSE N' UNION ALL ' END +
      N'SELECT TOP('+CAST(@MaxNodes AS nvarchar(10))+N') '+
        N'N''' + @DisplayCol + N''' AS displayCol, '+
        @edgeLit + N' AS edgeLabel, '+
        CASE WHEN @DisplayCol = N'ID_R_ID' THEN N'ED_R_ED' ELSE N'NULL' END + N' AS ed_r_ed, '+
        N'CONVERT(nvarchar(256), '+QUOTENAME(@DisplayCol)+N') AS id, '+
        QUOTENAME(@TextCol)+N' AS [text], '+
        @dirLit + N' AS [direction], '+
        CASE WHEN hasEd=1 THEN QUOTENAME(@EdCol)             ELSE N'NULL' END + N' AS ed, '+
        CASE WHEN hasNodeDate=1 THEN QUOTENAME(@NodeDateCol) ELSE N'NULL' END + N' AS nodeDate '+
      N'FROM '+fqname+N' '+
      N'WHERE '+QUOTENAME(@SearchCol)+N' = CONVERT('+search_type+N', @Src) '+
      N'AND '+QUOTENAME(@DateCol)+N' BETWEEN @From AND @To '+
      N'AND '+QUOTENAME(@DisplayCol)+N' IS NOT NULL'
    FROM #T;

    IF @sql <> N''
    BEGIN
      INSERT #Out(displayCol, edgeLabel, ed_r_ed, id, [text], [direction], ed, nodeDate)
      EXEC sp_executesql @sql,
        N'@Src nvarchar(4000), @From date, @To date',
        @Src=@SourceId, @From=@FromDate, @To=@ToDate;
    END

    DROP TABLE #T;

    FETCH NEXT FROM cur INTO @SearchCol, @DisplayCol, @RelCol, @Direction, @EdgeLabel;
  END

  CLOSE cur; DEALLOCATE cur;

  /* 3) Final result (dedup + edge label fallback + color + localized nodeTypeLabel) */
  SELECT
      o.displayCol,
      COALESCE(NULLIF(o.edgeLabel, N''), o.ed_r_ed) AS edgeLabel,
      o.id,
      o.[text],
      o.ed_r_ed,
      o.[direction],
      o.ed,
      o.nodeDate,
      n.ColumnColor AS color,
      CASE WHEN @Lang='ar' THEN n.ColumnAr ELSE n.ColumnEn END AS nodeTypeLabel
  FROM #Out o
  LEFT JOIN graphdb.Nodes n
    ON n.Column_ID = o.displayCol
    where  n.IsActive=1
  GROUP BY
      o.displayCol,
      COALESCE(NULLIF(o.edgeLabel, N''), o.ed_r_ed),
      o.id,
      o.[text],
      o.ed_r_ed,
      o.[direction],
      o.ed,
      o.nodeDate,
      n.ColumnColor,
      CASE WHEN @Lang='ar' THEN n.ColumnAr ELSE n.ColumnEn END
  ORDER BY o.displayCol, o.id;
END
GO
/****** Object:  StoredProcedure [graphdb].[api_NodeLegendsGet]    Script Date: 11/19/2025 7:37:09 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE   PROCEDURE [graphdb].[api_NodeLegendsGet]
  @Lang       nvarchar(2),                 -- 'en' | 'ar'
  @ViewIds    graphdb.IntList READONLY,    -- list of view IDs to consider
  @OnlyActive bit = 1                      -- 1 = only Nodes.IsActive = 1
AS
BEGIN
  SET NOCOUNT ON;

  /* 1) Resolve selected views with language-specific names */
  ;WITH V AS (
    SELECT
      v.ViewID,
      v.ViewDB,
      v.ViewSchema,
      CASE WHEN @Lang = N'ar' THEN v.ViewNameAr ELSE v.ViewNameEn END AS ViewName,
      OBJECT_ID(
        QUOTENAME(v.ViewDB)+'.'+QUOTENAME(v.ViewSchema)+'.'+QUOTENAME(
          CASE WHEN @Lang = N'ar' THEN v.ViewNameAr ELSE v.ViewNameEn END
        )
      ) AS oid
    FROM graphdb.ViewRegistry v
    JOIN @ViewIds i ON i.ViewID = v.ViewID
  )
  SELECT ViewID, ViewDB, ViewSchema, ViewName, oid
  INTO #V
  FROM V;

  IF NOT EXISTS (SELECT 1 FROM #V)
  BEGIN
    SELECT TOP(0)
      CAST(NULL AS sysname)       AS colId,
      CAST(NULL AS nvarchar(200)) AS label,
      CAST(NULL AS nvarchar(20))  AS color;
    RETURN;
  END

  /* 2) Gather all ID_*_ID columns that exist in these views */
  SELECT DISTINCT c.name AS Column_ID
  INTO #Cols
  FROM #V v
  JOIN sys.columns c ON c.object_id = v.oid
  WHERE c.name LIKE N'ID\_%\_ID' ESCAPE N'\';

  /* 3) Return legends from graphdb.Nodes limited to present columns and optional IsActive */
  SELECT
      n.Column_ID                                               AS colId,
      CASE WHEN @Lang = N'ar' THEN n.ColumnAr ELSE n.ColumnEn END AS label,
      n.ColumnColor                                             AS color
  FROM #Cols c
  JOIN graphdb.Nodes n ON n.Column_ID = c.Column_ID
  WHERE (@OnlyActive = 0 OR n.IsActive = 1)
  ORDER BY label;
END
GO
/****** Object:  StoredProcedure [graphdb].[api_NodesGet]    Script Date: 11/19/2025 7:37:09 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [graphdb].[api_NodesGet]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        Column_ID,
        ColumnEn,
        ColumnAr,
        a.[GroupNodeID],
        [GroupNodeTag],
        IsActive,
        ColumnColor
    FROM graphdb.Nodes a
    inner join [graphdb].[GroupNode] b on a.[GroupNodeID]=b.GroupNodeID
    ORDER BY ColumnEn;

END
GO
/****** Object:  StoredProcedure [graphdb].[api_NodeTypesGet]    Script Date: 11/19/2025 7:37:09 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

/* =========================================================
   1) api_GetNodeTypes
   - Lists available node types (localized) present in selected views
   - Returns: colId, ntCol, textCol, label
   ========================================================= */
CREATE   PROCEDURE [graphdb].[api_NodeTypesGet]
  @Lang nvarchar(2),                 -- 'en' or 'ar'
  @ViewIds graphdb.IntList READONLY
AS
BEGIN
  SET NOCOUNT ON;

  ;WITH V AS (
    SELECT v.ViewDB, v.ViewSchema, v.ViewNameEn
    FROM graphdb.ViewRegistry v
    JOIN @ViewIds i ON i.ViewID = v.ViewID
  ),
  O AS (
    SELECT DISTINCT
      OBJECT_ID(QUOTENAME(ViewDB)+'.'+QUOTENAME(ViewSchema)+'.'+QUOTENAME(ViewNameEn)) AS oid
    FROM V
  ),
  C AS (
    SELECT DISTINCT c.name AS Column_ID
    FROM O
    JOIN sys.columns c ON c.object_id = O.oid
    WHERE c.name LIKE N'ID\_%\_ID' ESCAPE N'\'
  )
  SELECT
      s.Column_ID                                               AS colId,
      REPLACE(REPLACE(s.Column_ID,'ID_','NT_'),'_ID','_NT')     AS ntCol,
      REPLACE(REPLACE(s.Column_ID,'ID_','TEXT_'),'_ID','_TEXT') AS textCol,
      CASE WHEN @Lang='ar' THEN s.ColumnAr ELSE s.ColumnEn END  AS label
  FROM C
  JOIN graphdb.Nodes s ON s.Column_ID = C.Column_ID
  WHERE s.IsActive = 1
  ORDER BY s.Column_ID;
END
GO
/****** Object:  StoredProcedure [graphdb].[api_NodeUpdate]    Script Date: 11/19/2025 7:37:09 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [graphdb].[api_NodeUpdate]
    @Column_ID    sysname,          -- Primary key: e.g. 'ID_A_ID'
    @ColumnEn     nvarchar(200) = NULL,
    @ColumnAr     nvarchar(200) = NULL,
    @IsActive     bit = NULL,
    @ColumnColor  nvarchar(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE graphdb.Nodes
    SET 
        ColumnEn    = COALESCE(@ColumnEn, ColumnEn),
        ColumnAr    = COALESCE(@ColumnAr, ColumnAr),
        --IsActive    = COALESCE(@IsActive, IsActive),
        ColumnColor = COALESCE(@ColumnColor, ColumnColor)
    WHERE Column_ID = @Column_ID;
END
GO
/****** Object:  StoredProcedure [graphdb].[api_RelationDelete]    Script Date: 11/19/2025 7:37:09 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [graphdb].[api_RelationDelete]
    @RelationID INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM graphdb.Relations WHERE RelationID = @RelationID)
    BEGIN
        RAISERROR('RelationID not found.', 16, 1);
        RETURN;
    END;

    DELETE FROM graphdb.Relations
    WHERE RelationID = @RelationID;
END;
GO
/****** Object:  StoredProcedure [graphdb].[api_RelationSave]    Script Date: 11/19/2025 7:37:09 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [graphdb].[api_RelationSave]
    @Source_Column_ID   nvarchar(128),
    @Search_Column_ID   nvarchar(128),
    @Display_Column_ID  nvarchar(128),
    @Direction          nchar(10)      = NULL,
    @Relation_Column_ID nvarchar(128)  = NULL,
    @RelationEn         nvarchar(128)  = NULL,
    @RelationAr         nvarchar(128)  = NULL
AS
BEGIN
    SET NOCOUNT ON;

    --------------------------------------------------------
    -- 1) Basic required fields
    --------------------------------------------------------
    IF @Source_Column_ID IS NULL
       OR @Search_Column_ID IS NULL
       OR @Display_Column_ID IS NULL
    BEGIN
        RAISERROR('Source_Column_ID, Search_Column_ID and Display_Column_ID are required.', 16, 1);
        RETURN;
    END;

    --------------------------------------------------------
    -- 2) Business rules
    --
    -- a) If Relation_Column_ID is NOT NULL
    --      => RelationEn & RelationAr MUST be NULL
    --
    -- b) If RelationEn & RelationAr are NOT NULL
    --      => Relation_Column_ID MUST be NULL
    --
    -- c) If RelationEn is NOT NULL => RelationAr is NOT NULL
    -- d) If RelationAr is NOT NULL => RelationEn is NOT NULL
    --
    -- e) NEW: Either Relation_Column_ID is provided
    --         OR (RelationEn & RelationAr) are provided.
    --         All three NULL is NOT allowed.
    --------------------------------------------------------

    -- c & d: both or none
    IF (@RelationEn IS NOT NULL AND @RelationAr IS NULL)
       OR (@RelationEn IS NULL AND @RelationAr IS NOT NULL)
    BEGIN
        RAISERROR('RelationEn and RelationAr must both be NULL or both be NOT NULL.', 16, 1);
        RETURN;
    END;

    -- a: Relation_Column_ID + any text is not allowed
    IF @Relation_Column_ID IS NOT NULL
       AND (@RelationEn IS NOT NULL OR @RelationAr IS NOT NULL)
    BEGIN
        RAISERROR('When Relation_Column_ID is provided, RelationEn and RelationAr must be NULL.', 16, 1);
        RETURN;
    END;

    -- b: When both texts are present, Relation_Column_ID must be NULL
    IF @RelationEn IS NOT NULL AND @RelationAr IS NOT NULL
       AND @Relation_Column_ID IS NOT NULL
    BEGIN
        RAISERROR('When RelationEn and RelationAr are provided, Relation_Column_ID must be NULL.', 16, 1);
        RETURN;
    END;

    -- e: At least one kind of relation must be provided
    IF @Relation_Column_ID IS NULL
       AND @RelationEn IS NULL
       AND @RelationAr IS NULL
    BEGIN
        RAISERROR('Either Relation_Column_ID or (RelationEn and RelationAr) must be provided.', 16, 1);
        RETURN;
    END;

    --------------------------------------------------------
    -- 3) Upsert (update if exists, else insert)
    --    Key: (Source_Column_ID, Search_Column_ID, Display_Column_ID)
    --------------------------------------------------------
    IF EXISTS (
        SELECT 1
        FROM graphdb.Relations r
        WHERE r.Source_Column_ID  = @Source_Column_ID
          AND r.Search_Column_ID  = @Search_Column_ID
          AND r.Display_Column_ID = @Display_Column_ID
    )
    BEGIN
        -- UPDATE existing row
        UPDATE graphdb.Relations
        SET Direction          = @Direction,
            Relation_Column_ID = @Relation_Column_ID,
            RelationEn         = @RelationEn,
            RelationAr         = @RelationAr
        WHERE Source_Column_ID  = @Source_Column_ID
          AND Search_Column_ID  = @Search_Column_ID
          AND Display_Column_ID = @Display_Column_ID;
    END
    ELSE
    BEGIN
        -- INSERT new row
        INSERT INTO graphdb.Relations
        (
            Source_Column_ID,
            Search_Column_ID,
            Display_Column_ID,
            Direction,
            Relation_Column_ID,
            RelationEn,
            RelationAr
        )
        VALUES
        (
            @Source_Column_ID,
            @Search_Column_ID,
            @Display_Column_ID,
            @Direction,
            @Relation_Column_ID,
            @RelationEn,
            @RelationAr
        );
    END
END;
GO
/****** Object:  StoredProcedure [graphdb].[api_RelationsGet]    Script Date: 11/19/2025 7:37:09 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [graphdb].[api_RelationsGet]
    @Lang nvarchar(2) = N'en'      -- 'en' or 'ar'
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        -- Raw relation fields
        r.RelationID,
        r.Source_Column_ID,
        r.Search_Column_ID,
        r.Display_Column_ID,
        r.Direction,
        r.Relation_Column_ID,
        r.RelationEn,
        r.RelationAr,

        -- Friendly labels
        SourceLabel  = CASE WHEN @Lang = N'ar' THEN nSrc.ColumnAr  ELSE nSrc.ColumnEn  END,
        SearchLabel  = CASE WHEN @Lang = N'ar' THEN nSch.ColumnAr  ELSE nSch.ColumnEn  END,
        DisplayLabel = CASE WHEN @Lang = N'ar' THEN nDisp.ColumnAr ELSE nDisp.ColumnEn END

    FROM graphdb.Relations r
    LEFT JOIN graphdb.Nodes nSrc
        ON nSrc.Column_ID = r.Source_Column_ID
    LEFT JOIN graphdb.Nodes nSch
        ON nSch.Column_ID = r.Search_Column_ID
    LEFT JOIN graphdb.Nodes nDisp
        ON nDisp.Column_ID = r.Display_Column_ID

    ORDER BY
        r.Source_Column_ID,
        r.Search_Column_ID,
        r.Display_Column_ID;
END;
GO
/****** Object:  StoredProcedure [graphdb].[api_ViewColumnItemsGet]    Script Date: 11/19/2025 7:37:09 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [graphdb].[api_ViewColumnItemsGet]
  @Lang nvarchar(2),
  @ViewIds graphdb.IntList READONLY,
  @ColId sysname,
  @MaxCount int
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @TextCol sysname = REPLACE(REPLACE(@ColId, 'ID_', 'TEXT_'), '_ID', '_TEXT');

  ;WITH V AS (
    SELECT
      v.ViewDB,
      v.ViewSchema,
      CASE WHEN @Lang = N'ar' THEN v.ViewNameAr ELSE v.ViewNameEn END AS ViewName,
      OBJECT_ID(
        QUOTENAME(v.ViewDB)+'.'+QUOTENAME(v.ViewSchema)+'.'+QUOTENAME(
          CASE WHEN @Lang = N'ar' THEN v.ViewNameAr ELSE v.ViewNameEn END
        )
      ) AS oid,
      QUOTENAME(v.ViewDB)+'.'+QUOTENAME(v.ViewSchema)+'.'+QUOTENAME(
        CASE WHEN @Lang = N'ar' THEN v.ViewNameAr ELSE v.ViewNameEn END
      ) AS fqname
    FROM graphdb.ViewRegistry v
    JOIN @ViewIds i ON i.ViewID = v.ViewID
  ),
  T AS (
    SELECT v.fqname
    FROM V v
    JOIN sys.columns c1 ON c1.object_id = v.oid AND c1.name = @ColId
    JOIN sys.columns c2 ON c2.object_id = v.oid AND c2.name = @TextCol
  )
  SELECT fqname INTO #T FROM T;

  IF NOT EXISTS (SELECT 1 FROM #T)
  BEGIN
    SELECT TOP(0)
      CAST(NULL AS nvarchar(256)) AS id,
      CAST(NULL AS nvarchar(400)) AS [text];
    RETURN;
  END;

  DECLARE @selects nvarchar(max) = N'';

  SELECT @selects = @selects +
    CASE WHEN @selects = N'' THEN N'' ELSE N' UNION ALL ' END +
    N'SELECT CONVERT(nvarchar(256), '+QUOTENAME(@ColId)+N') AS id, '+
       QUOTENAME(@TextCol)+N' AS [text] '+
    N'FROM '+fqname+N' WHERE '+QUOTENAME(@ColId)+N' IS NOT NULL'
  FROM #T;

  IF (@selects = N'')
  BEGIN
    SELECT TOP(0)
      CAST(NULL AS nvarchar(256)) AS id,
      CAST(NULL AS nvarchar(400)) AS [text];
    RETURN;
  END;

  DECLARE @sql nvarchar(max) =
    N'SELECT DISTINCT TOP('+CAST(@MaxCount AS nvarchar(10))+N') id, [text] FROM (' +
    @selects +
    N') AS X ORDER BY [text];';

  EXEC sp_executesql @sql;
END
GO
/****** Object:  StoredProcedure [graphdb].[api_ViewsGet]    Script Date: 11/19/2025 7:37:09 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE   PROCEDURE [graphdb].[api_ViewsGet]
  @Lang nvarchar(2)  -- 'en' | 'ar'
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
      v.ViewID,
      CASE WHEN @Lang = N'ar' THEN v.ViewDescriptionAr ELSE v.ViewDescriptionEn END AS viewDescription,
      CASE WHEN @Lang = N'ar' THEN v.ViewNameAr       ELSE v.ViewNameEn       END AS viewName,
      v.ViewDB,
      v.ViewSchema
  FROM graphdb.ViewRegistry v
  ORDER BY v.ViewID;
END
GO
/****** Object:  StoredProcedure [graphdb].[sp_NodesGenerate]    Script Date: 11/19/2025 7:37:09 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE  PROCEDURE [graphdb].[sp_NodesGenerate]
  @PruneMissing BIT = 1     -- 1 = hard delete rows no longer present in any registered view
AS
/*
exec [graphdb].[sp_NodesGenerate]
*/
BEGIN
  SET NOCOUNT ON;

  BEGIN TRY
    BEGIN TRAN;

    DECLARE @V TABLE(oid INT NOT NULL);
    INSERT @V(oid)
    SELECT OBJECT_ID(QUOTENAME(ViewDB)+N'.'+QUOTENAME(ViewSchema)+N'.'+QUOTENAME(ViewNameEn))
    FROM graphdb.ViewRegistry
    WHERE ViewNameEn IS NOT NULL;

    ;WITH C AS (
      SELECT DISTINCT c.name AS Column_ID
      FROM @V v
      JOIN sys.columns c ON c.object_id = v.oid
      WHERE c.name LIKE N'ID\_%\_ID' ESCAPE N'\'
    )
    SELECT Column_ID INTO #All FROM C;

    -- Insert new ID_ columns
    INSERT INTO graphdb.Nodes (Column_ID)
    SELECT a.Column_ID
    FROM #All a
    LEFT JOIN graphdb.Nodes s ON s.Column_ID = a.Column_ID
    WHERE s.Column_ID IS NULL;

    

    -- Hard delete missing, if requested
    IF @PruneMissing = 1
    BEGIN
      DELETE s
      FROM graphdb.Nodes s
      LEFT JOIN #All a ON a.Column_ID = s.Column_ID
      WHERE a.Column_ID IS NULL;
    END

    COMMIT;
  END TRY
  BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    DECLARE @msg NVARCHAR(4000) = ERROR_MESSAGE();
    RAISERROR(@msg, 16, 1);
  END CATCH
END;
GO
