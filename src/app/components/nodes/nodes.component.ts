import { Component } from '@angular/core';
import { NodeComponent } from './node.component';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

export interface NodeZ {
  id: string;
  children: NodeZ[];
}

@Component({
  standalone: true,
  imports: [NodeComponent, CommonModule],
  template: '<div><p>Hello</p></div>',
  selector: 'nodes',
})
export class NodesComponent {
  nodes: NodeZ[] = [
    {
      id: '1',
      children: [
        {
          id: '2',
          children: [{ id: '3', children: [{ id: '4', children: [] }] }],
        },
      ],
    },
  ];
}
