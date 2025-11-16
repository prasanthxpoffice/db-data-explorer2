USE [IAS]
GO
/****** Object:  StoredProcedure [graphdb].[GenerateNodes]    Script Date: 16/11/2025 11:50:47 PM ******/
DROP PROCEDURE [graphdb].[GenerateNodes]
GO
/****** Object:  StoredProcedure [graphdb].[api_GetViews]    Script Date: 16/11/2025 11:50:47 PM ******/
DROP PROCEDURE [graphdb].[api_GetViews]
GO
/****** Object:  StoredProcedure [graphdb].[api_GetNodeTypes]    Script Date: 16/11/2025 11:50:47 PM ******/
DROP PROCEDURE [graphdb].[api_GetNodeTypes]
GO
/****** Object:  StoredProcedure [graphdb].[api_GetItems]    Script Date: 16/11/2025 11:50:47 PM ******/
DROP PROCEDURE [graphdb].[api_GetItems]
GO
/****** Object:  StoredProcedure [graphdb].[api_Expand]    Script Date: 16/11/2025 11:50:47 PM ******/
DROP PROCEDURE [graphdb].[api_Expand]
GO
/****** Object:  StoredProcedure [graphdb].[api_Expand]    Script Date: 16/11/2025 11:50:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [graphdb].[api_Expand]
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
/****** Object:  StoredProcedure [graphdb].[api_GetItems]    Script Date: 16/11/2025 11:50:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [graphdb].[api_GetItems]
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
/****** Object:  StoredProcedure [graphdb].[api_GetNodeTypes]    Script Date: 16/11/2025 11:50:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

/* =========================================================
   1) api_GetNodeTypes
   - Lists available node types (localized) present in selected views
   - Returns: colId, ntCol, textCol, label
   ========================================================= */
CREATE   PROCEDURE [graphdb].[api_GetNodeTypes]
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
/****** Object:  StoredProcedure [graphdb].[api_GetViews]    Script Date: 16/11/2025 11:50:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE   PROCEDURE [graphdb].[api_GetViews]
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
/****** Object:  StoredProcedure [graphdb].[GenerateNodes]    Script Date: 16/11/2025 11:50:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE  PROCEDURE [graphdb].[GenerateNodes]
  @PruneMissing BIT = 1     -- 1 = hard delete rows no longer present in any registered view
AS
/*
exec [graphdb].[GenerateNodes]
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
