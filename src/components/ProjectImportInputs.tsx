import { forwardRef, useImperativeHandle, useRef } from "react";

export interface ProjectImportHandle {
  openFolder: () => void;
  openFiles: () => void;
}

interface Props {
  onFilesSelected: (files: FileList) => void;
}

export const ProjectImportInputs = forwardRef<ProjectImportHandle, Props>(
  function ProjectImportInputs({ onFilesSelected }, ref) {
    const folderRef = useRef<HTMLInputElement>(null);
    const filesRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      openFolder: () => folderRef.current?.click(),
      openFiles: () => filesRef.current?.click(),
    }));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (list && list.length > 0) onFilesSelected(list);
      e.target.value = "";
    };

    return (
      <>
        <input
          ref={folderRef}
          type="file"
          multiple
          className="hidden"
          {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
          onChange={handleChange}
        />
        <input
          ref={filesRef}
          type="file"
          multiple
          accept=".html,.htm,.js,.jsx,.ts,.tsx,.css,.sql,text/html,text/css,text/javascript,application/javascript"
          className="hidden"
          onChange={handleChange}
        />
      </>
    );
  }
);
